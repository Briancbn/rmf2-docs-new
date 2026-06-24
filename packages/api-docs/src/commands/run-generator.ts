// A small registry of pluggable API-docs generators and a
// `ApiDocsGenerator` dispatcher. Add Python (sphinx) or Rust (rustdoc) support by
// implementing `runGenerator` and calling `registerGenerator`.

import { resolve } from 'node:path'

import { GENERATORS } from '../generators'
import { generateIndex } from '../index-page'
import type { DocsConfig } from '../types'

// Run a docs entry through its matching generator, then write a landing index
// for its output. Unknown types are skipped with a warning.
export async function runGenerator(
  name: string,
  repoDir: string,
  docsConfig: DocsConfig,
  sourceUrl: string,
  verbose: boolean = false
): Promise<void> {
  const generator = GENERATORS.get(docsConfig.type)
  if (!generator) {
    console.warn(
      `⚠ Skipping ${name} docs: unsupported type "${docsConfig.type}"`
    )
    return
  }

  const outDir = resolve(docsConfig.outDir)
  await generator.generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config: docsConfig,
    verbose,
  })

  // Generator-agnostic landing page for the produced markdown.
  await generateIndex(outDir, name)
}
