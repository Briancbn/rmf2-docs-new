import { join } from 'node:path'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type { ApiDocsGenerator, GenerateContext } from '../../types'
import { run } from '../../utils'
import { generateIndex } from '../index-page'
import { formatModulePage } from './format-page'

// VitePress frontmatter shared with the C++ pages: surface H2/H3 symbols in the
// right-hand "On this page" outline.
const FRONTMATTER = '---\noutline: [2, 3]\n---\n'

// A cached reader that maps a `[source]` blob URL back to the cloned file, so the
// formatter can pull field types and base classes from the Python source. The
// path captured after `/blob/<ref>/` is relative to the git root (`repoDir`).
function makeSourceReader(
  repoDir: string
): (url: string) => string | undefined {
  const cache = new Map<string, string | undefined>()
  return (url) => {
    const match = url.match(/\/blob\/[^/]+\/(.+?)(?:#L\d+)?$/)
    if (!match) return undefined
    const rel = match[1]
    if (!cache.has(rel)) {
      try {
        cache.set(rel, readFileSync(join(repoDir, rel), 'utf8'))
      } catch {
        cache.set(rel, undefined)
      }
    }
    return cache.get(rel)
  }
}

// lazydocs-specific fields on a docs entry.
interface LazydocsConfig {
  // uv project directory (with pyproject.toml), relative to the repo root.
  // lazydocs runs there via `uv run` so the target modules are importable.
  projectDir?: string
  // Modules / paths to document (relative to projectDir), e.g. ["res_mapf_planning"].
  srcPaths: string[]
}

// lazydocs symbol kinds -> VitePress <Badge> types.
const BADGE_TYPE: Record<string, string> = {
  module: 'tip',
  class: 'info',
  function: 'warning',
  method: 'warning',
  property: 'info',
}

// Replace lazydocs' raw HTML with VitePress-native markup: the `<kbd>` kind
// labels become <Badge> components, the floating shields.io "source" image
// becomes a plain link, and the markdownlint directive is dropped.
function cleanLazydocs(markdown: string): string {
  return markdown
    .replace(/<!-- markdownlint-disable -->\n*/g, '')
    .replace(
      /<a href="([^"]*)">\s*<img[^>]*shields\.io[^>]*>\s*<\/a>/g,
      '[source]($1)'
    )
    .replace(
      /<kbd>([^<]*)<\/kbd>/g,
      (_match, label) =>
        `<Badge type="${BADGE_TYPE[label.toLowerCase()] ?? 'info'}" text="${label}" />`
    )
}

// Tags to keep when sanitizing; `Badge` is the VitePress component we emit. Any
// other `<...>` (e.g. `<Foo>` type hints) is escaped so Vue doesn't fail with
// "missing end tag".
const HTML_TAGS = new Set([
  'a',
  'b',
  'badge',
  'br',
  'code',
  'details',
  'em',
  'i',
  'img',
  'kbd',
  'pre',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
])
const CODE_FENCE = /^\s*```/

function sanitizeForVitepress(markdown: string): string {
  let insideCodeFence = false
  return markdown
    .split('\n')
    .map((line) => {
      if (CODE_FENCE.test(line)) {
        insideCodeFence = !insideCodeFence
        return line
      }
      if (insideCodeFence) return line
      return line.replace(/<(\/?)([A-Za-z][\w-]*)/g, (match, slash, tag) =>
        HTML_TAGS.has(tag.toLowerCase()) ? match : `&lt;${slash}${tag}`
      )
    })
    .join('\n')
}

// Python (lazydocs) API-docs generator: runs lazydocs via uv to render markdown
// from Google-style docstrings. `uv run --with lazydocs` provides the project's
// environment plus lazydocs, so it can import the target modules.
export const lazydocsGenerator: ApiDocsGenerator = {
  type: 'lazydocs',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
    verbose,
  }: GenerateContext): Promise<void> {
    const doc = config as unknown as LazydocsConfig
    const cwd = doc.projectDir ? join(repoDir, doc.projectDir) : repoDir
    mkdirSync(outDir, { recursive: true })

    // Clear stale generated markdown, but leave any other files in place.
    for (const entry of readdirSync(outDir)) {
      if (entry.endsWith('.md')) {
        rmSync(join(outDir, entry))
      }
    }

    console.log(`\n⚙ lazydocs: ${name} -> ${outDir}`)
    await run(
      'uv',
      [
        'run',
        '--with',
        'lazydocs',
        'lazydocs',
        '--output-path',
        outDir,
        // Drop the "Made with lazydocs" footer.
        '--no-watermark',
        // lazydocs makes file paths relative to the git root, so the base is the
        // repo blob URL (without the project subdir).
        '--src-base-url',
        `${sourceUrl}/`,
        ...(doc.srcPaths ?? []),
      ],
      cwd,
      !verbose
    )

    // Sanitize for VitePress, restructure into the C++ page layout, and drop any
    // module with no documentable content.
    const readSource = makeSourceReader(repoDir)
    let removed = 0
    for (const entry of readdirSync(outDir)) {
      if (!entry.endsWith('.md')) continue
      const file = join(outDir, entry)
      const cleaned = sanitizeForVitepress(
        cleanLazydocs(readFileSync(file, 'utf8'))
      )
      const formatted = formatModulePage(cleaned, { readSource })
      if (formatted === null) {
        rmSync(file)
        removed += 1
      } else {
        writeFileSync(file, `${FRONTMATTER}\n${formatted}`)
      }
    }
    if (removed) console.log(`  removed ${removed} empty page(s)`)

    // Landing index for the generated Python pages. Mirrors the C++ index: the
    // shared, sidebar-grouped outline rather than lazydocs' flat overview.
    // Python qualified names join on "." and have no in-segment separators, so
    // group on every segment and title each page from its filename.
    await generateIndex(outDir, name, {
      separator: '.',
      fromFilename: true,
      groupDepth: Infinity,
    })
  },
}
