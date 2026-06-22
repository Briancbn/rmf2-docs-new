// Doxygen (C++) API-docs generator: runs doxygen to produce XML, then moxygen
// (with the custom templates/handlers) to render markdown.

import { join } from 'node:path'
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { run as runMoxygen, defaultFilters } from 'moxygen'
import { run, isContentEmpty } from '../../utils.ts'
import type { ApiDocsGenerator, GenerateContext } from '../../types.ts'
import { registerCustomTemplateHandlers } from './custom-template-handlers.ts'

// Register the custom Handlebars helpers and partial before any rendering.
registerCustomTemplateHandlers()

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

export const doxygenGenerator: ApiDocsGenerator = {
  type: 'doxygen',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
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
    await run('doxygen', [doc.doxyfile ?? 'Doxyfile'], repoDir)

    console.log(`\n⚙ moxygen: ${name} -> ${outDir}`)
    await runMoxygen({
      directory: xmlDir,
      output: join(outDir, '%s.md'),
      classes: true,
      templates: cppTemplatesDir,
      sourceUrl,
      filters: memberFilters,
    })

    // Remove pages that ended up with no real content (title only).
    let removed = 0
    for (const entry of readdirSync(outDir)) {
      const file = join(outDir, entry)
      if (entry.endsWith('.md') && isContentEmpty(readFileSync(file, 'utf8'))) {
        rmSync(file)
        removed += 1
      }
    }
    if (removed) console.log(`  removed ${removed} empty page(s)`)
  },
}
