// Public entry point: a small registry of pluggable API-docs generators and a
// `generateApiDocs` dispatcher. Add Python (sphinx) or Rust (rustdoc) support by
// implementing `ApiDocsGenerator` and calling `registerGenerator`.

import { resolve } from 'node:path'
import type { ApiDocsGenerator, DocsConfig } from './types.ts'
import { doxygenGenerator } from './generators/doxygen/index.ts'

const generators = new Map<string, ApiDocsGenerator>()

// Register a generator for its docs `type`.
export function registerGenerator(generator: ApiDocsGenerator): void {
  generators.set(generator.type, generator)
}

// Built-in generators.
registerGenerator(doxygenGenerator)

// Run every docs entry for a repo through its matching generator. Unknown types
// are skipped with a warning.
export async function generateApiDocs(
  name: string,
  repoDir: string,
  docs: DocsConfig[],
  sourceUrl: string
): Promise<void> {
  for (const config of docs) {
    const generator = generators.get(config.type)
    if (!generator) {
      console.warn(`⚠ Skipping ${name} docs: unsupported type "${config.type}"`)
      continue
    }

    await generator.generate({
      name,
      repoDir,
      outDir: resolve(config.outDir),
      sourceUrl,
      config,
    })
  }
}

export type { ApiDocsGenerator, DocsConfig, GenerateContext } from './types.ts'
