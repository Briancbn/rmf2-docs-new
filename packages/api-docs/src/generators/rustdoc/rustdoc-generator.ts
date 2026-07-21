import { join } from 'node:path'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type { ApiDocsGenerator, GenerateContext } from '../../types'
import { run } from '../../utils'
import { generateIndex } from '../index-page'
import { renderPages } from './render-page'
import { SUPPORTED_FORMAT_VERSION } from './rustdoc-json'
import type { RustdocRoot } from './rustdoc-json'

// VitePress frontmatter shared with the C++ pages: surface H2/H3 symbols in the
// right-hand "On this page" outline.
const FRONTMATTER = '---\noutline: [2, 3]\n---\n'

// rustdoc-specific fields on a docs entry.
interface RustdocConfig {
  // Cargo project directory (with Cargo.toml), relative to the repo root.
  crateDir?: string
  // Crate to document. Defaults to the directory's own package.
  crateName: string
  // Toolchain to invoke; rustdoc's JSON output is nightly-only.
  toolchain?: string
}

// Tags to keep when sanitizing. Anything else that looks like a tag (e.g. a
// `<T>` type parameter in prose) is escaped so Vue does not fail the build with
// "missing end tag".
const HTML_TAGS = new Set([
  'a',
  'b',
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

// Rust (rustdoc) API-docs generator: runs `cargo rustdoc` to produce rustdoc's
// JSON, then renders markdown from it — mirroring how the C++ side pairs
// doxygen's XML with moxygen, and the Python side pairs griffe's JSON with its
// own renderer.
//
// The JSON output is a nightly-only, versioned format, so this pins the
// toolchain and warns when the crate's `format_version` differs from the one
// the renderer was written against.
export const rustdocGenerator: ApiDocsGenerator = {
  type: 'rustdoc',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
    verbose,
  }: GenerateContext): Promise<void> {
    const doc = config as unknown as RustdocConfig
    const cwd = doc.crateDir ? join(repoDir, doc.crateDir) : repoDir
    const toolchain = doc.toolchain ?? 'nightly'
    mkdirSync(outDir, { recursive: true })

    // Clear stale generated markdown, but leave any other files in place.
    for (const entry of readdirSync(outDir)) {
      if (entry.endsWith('.md')) rmSync(join(outDir, entry))
    }

    console.log(`\n⚙ rustdoc: ${name} -> ${outDir}`)
    await run(
      'cargo',
      [
        `+${toolchain}`,
        'rustdoc',
        '--lib',
        '-Zunstable-options',
        '--output-format',
        'json',
      ],
      cwd,
      !verbose
    )

    const dumpFile = join(cwd, 'target', 'doc', `${doc.crateName}.json`)
    if (!existsSync(dumpFile)) {
      throw new Error(
        `rustdoc produced no JSON for ${name} at ${dumpFile} — check "crateName" in the manifest`
      )
    }

    const crate = JSON.parse(readFileSync(dumpFile, 'utf8')) as RustdocRoot
    if (crate.format_version !== SUPPORTED_FORMAT_VERSION) {
      console.warn(
        `  ⚠ rustdoc format_version ${crate.format_version} differs from the ` +
          `supported ${SUPPORTED_FORMAT_VERSION}; output may be incomplete`
      )
    }

    // rustdoc spans are relative to the crate root, but source links need a
    // repo-relative path.
    const pathPrefix = doc.crateDir ? `${doc.crateDir.replace(/\/$/, '')}/` : ''
    const pages = renderPages(crate, {
      crateName: doc.crateName,
      sourceUrl,
      pathPrefix,
    })

    for (const page of pages) {
      writeFileSync(
        join(outDir, `${page.name}.md`),
        `${FRONTMATTER}\n${sanitizeForVitepress(page.content)}`
      )
    }

    if (pages.length === 0) {
      throw new Error(
        `rustdoc produced no pages for ${name} — the crate has no public API`
      )
    }
    const modulePages = pages.filter((page) => page.kind === 'module').length
    console.log(
      `  wrote ${pages.length} page(s): ${modulePages} module, ${pages.length - modulePages} type`
    )

    // Landing index. Rust paths use `::` like C++, so the default sidebar
    // conventions (titles from each page's H1) apply unchanged.
    await generateIndex(outDir, name, { maxDepth: Infinity })
  },
}
