// A small registry of pluggable API-docs generators and a
// `ApiDocsGenerator` dispatcher. Add Python (sphinx) or Rust (rustdoc) support by
// implementing `runGenerator` and calling `registerGenerator`.

import { resolve } from 'node:path'

import { GENERATORS } from '../generators'
import type { ApiDocsGenerator, DocsConfig } from '../types'

// Run every docs entry for a repo through its matching generator. Unknown types
// are skipped with a warning.
export async function runGenerator(
  name: string,
  repoDir: string,
  docsConfig: DocsConfig,
  sourceUrl: string
): Promise<void> {
  const generator = GENERATORS.get(docsConfig.type)
  if (!generator) {
    console.warn(
      `⚠ Skipping ${name} docs: unsupported type "${docsConfig.type}"`
    )
    return
  }

  await generator.generate({
    name,
    repoDir,
    outDir: resolve(docsConfig.outDir),
    sourceUrl,
    config: docsConfig,
  })
}
