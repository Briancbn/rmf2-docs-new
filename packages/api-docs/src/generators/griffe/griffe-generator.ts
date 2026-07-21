import { join, relative, resolve } from 'node:path'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import type { ApiDocsGenerator, GenerateContext } from '../../types'
import { run } from '../../utils'
import { generateIndex } from '../index-page'
import { renderPages } from './render-page'
import type { DumpNode } from './dump'
import type { ModuleEntry } from './render-page'

// VitePress frontmatter shared with the C++ pages: surface H2/H3 symbols in the
// right-hand "On this page" outline.
const FRONTMATTER = '---\noutline: [2, 3]\n---\n'

// griffe-specific fields on a docs entry.
interface GriffeConfig {
  // uv project directory (with pyproject.toml), relative to the repo root.
  // griffe runs there via `uv run` so the target packages are on its search path.
  projectDir?: string
  // Packages to document, e.g. ["res_mapf_planning"].
  srcPaths: string[]
}

// Tags to keep when sanitizing. Anything else that looks like a tag (e.g. a
// `<Foo>` type hint in prose) is escaped so Vue does not fail the build with
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

// Walk a package tree, yielding every module. Submodule aliases (a package that
// re-exports another package's module) are skipped so a module is documented
// once, at its real location.
function* walkModules(
  node: DumpNode,
  path: string
): Generator<{ node: DumpNode; name: string }> {
  yield { node, name: path }
  for (const [name, member] of Object.entries(node.members ?? {})) {
    if (member.kind === 'module') yield* walkModules(member, `${path}.${name}`)
  }
}

// Python (griffe) API-docs generator. Griffe analyses the source statically, so
// unlike the runtime-introspection tools it documents modules that cannot be
// imported in the docs environment, and it understands modern annotation syntax
// (`X | Y`, string annotations). It only extracts — the markdown is rendered
// here, mirroring how the C++ side pairs doxygen's XML with moxygen.
export const griffeGenerator: ApiDocsGenerator = {
  type: 'griffe',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
    verbose,
  }: GenerateContext): Promise<void> {
    const doc = config as unknown as GriffeConfig
    const cwd = doc.projectDir ? join(repoDir, doc.projectDir) : repoDir
    mkdirSync(outDir, { recursive: true })

    // Clear stale generated markdown, but leave any other files in place.
    for (const entry of readdirSync(outDir)) {
      if (entry.endsWith('.md')) rmSync(join(outDir, entry))
    }

    console.log(`\n⚙ griffe: ${name} -> ${outDir}`)
    const scratch = mkdtempSync(join(tmpdir(), 'griffe-'))
    const dumpFile = join(scratch, 'api.json')
    try {
      await run(
        'uv',
        [
          'run',
          '--with',
          'griffe',
          'griffe',
          'dump',
          '--output',
          dumpFile,
          // Parse Google-style docstrings, so griffe warns about parameters that
          // no longer match a signature.
          '--docstyle',
          'google',
          ...(doc.srcPaths ?? []),
        ],
        cwd,
        !verbose
      )

      const packages = JSON.parse(readFileSync(dumpFile, 'utf8')) as Record<
        string,
        DumpNode
      >

      const modules: ModuleEntry[] = []
      for (const [packageName, root] of Object.entries(packages)) {
        for (const { node, name } of walkModules(root, packageName)) {
          if (!node.filepath) continue
          modules.push({
            node,
            name,
            path: relative(repoDir, resolve(node.filepath)),
          })
        }
      }

      const pages = renderPages(modules, sourceUrl)
      for (const page of pages) {
        writeFileSync(
          join(outDir, `${page.name}.md`),
          `${FRONTMATTER}\n${sanitizeForVitepress(page.content)}`
        )
      }

      const modulePages = pages.filter((page) => page.kind === 'module').length
      // A module that produced no page of its own was an empty re-export shim
      // (a package `__init__` that only imports).
      const skipped = modules.length - modulePages
      if (pages.length === 0) {
        throw new Error(
          `griffe produced no pages for ${name} — check "srcPaths" in the manifest`
        )
      }
      console.log(
        `  wrote ${pages.length} page(s): ${modulePages} module, ${pages.length - modulePages} class`
      )
      if (skipped > 0) console.log(`  skipped ${skipped} empty module(s)`)
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }

    await generateIndex(outDir, name, {
      // Full module-tree nesting (Python names have no separator inside a
      // segment, unlike C++ template args). Unlike the sidebar, a markdown
      // list has no depth limit, so the landing page keeps the whole tree.
      separator: '.',
      fromFilename: true,
      groupDepth: Infinity,
      maxDepth: Infinity,
    })
  },
}
