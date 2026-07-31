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
import { run as runMoxygen, defaultFilters } from 'moxygen'
import { run, isContentEmpty } from '../../utils'
import { generateIndex } from '../index-page'

// Bundled custom C++ templates, resolved relative to this module.
const cppTemplatesDir = join(import.meta.dirname, 'moxygen-templates', 'cpp')

// Drop private members so no "Private ..." sections (attributes, methods, etc.)
// are emitted.
const memberFilters = {
  members: defaultFilters.members.filter((kind) => !kind.startsWith('private')),
  compounds: defaultFilters.compounds,
}

// doxygen-specific fields on a docs entry.
interface DoxygenConfig {
  // Doxygen XML output directory, relative to the repo.
  xmlPath: string
  // Doxyfile to run, relative to the repo root (default: "Doxyfile").
  doxyfile?: string
}

// Doxygen (C++) API-docs generator: runs doxygen to produce XML, then moxygen
// (with the custom templates/handlers) to render markdown.
export const doxygenGenerator: ApiDocsGenerator = {
  type: 'doxygen',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
    verbose,
  }: GenerateContext): Promise<void> {
    const doc = config as unknown as DoxygenConfig
    const xmlDir = join(repoDir, doc.xmlPath)
    mkdirSync(outDir, { recursive: true })

    // Clear stale generated markdown, but leave any other files in place.
    for (const entry of readdirSync(outDir)) {
      if (entry.endsWith('.md')) {
        rmSync(join(outDir, entry))
      }
    }

    console.log(`\n⚙ doxygen: ${name}`)
    await run('doxygen', [doc.doxyfile ?? 'Doxyfile'], repoDir, !verbose)

    console.log(`\n⚙ moxygen: ${name} -> ${outDir}`)
    await runMoxygen({
      directory: xmlDir,
      output: join(outDir, '%s.md'),
      classes: true,
      templates: cppTemplatesDir,
      sourceUrl,
      filters: memberFilters,
      quiet: !verbose,
    })

    // Remove pages that ended up with no real content (title only), keeping the
    // basenames so cross-references to them can be repaired below.
    const removed = new Set<string>()
    for (const entry of readdirSync(outDir)) {
      const file = join(outDir, entry)
      if (entry.endsWith('.md') && isContentEmpty(readFileSync(file, 'utf8'))) {
        rmSync(file)
        removed.add(entry.slice(0, -'.md'.length))
      }
    }
    if (removed.size) console.log(`  removed ${removed.size} empty page(s)`)

    // Landing index for the generated C++ pages.
    await generateIndex(outDir, name)

    // Repair links to the removed pages: their content is folded into the
    // landing `index.md`, so point cross-references there. The root page
    // (basename `name`) shares index.md's title/anchor, so its fragment is
    // preserved; other removed pages have no matching anchor, so drop it.
    // Only runs when there is an index.md to point at (generateIndex skips
    // writing one when there are no pages to list).
    if (removed.size && existsSync(join(outDir, 'index.md'))) {
      for (const entry of readdirSync(outDir)) {
        if (!entry.endsWith('.md')) continue
        const file = join(outDir, entry)
        const original = readFileSync(file, 'utf8')
        const fixed = original.replace(
          /\]\((?:\.\/)?([^)#\s]+)\.md(#[^)\s]+)?\)/g,
          (whole, page: string, fragment = '') =>
            removed.has(page)
              ? `](index.md${page === name ? fragment : ''})`
              : whole
        )
        if (fixed !== original) writeFileSync(file, fixed)
      }
    }
  },
}
