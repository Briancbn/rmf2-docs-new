import type { DocsConfig } from './docs-config'

// Everything a generator needs to produce docs for one target.
export interface GenerateContext {
  // Repo name, for logging.
  name: string
  // Absolute path to the cloned repo.
  repoDir: string
  // Absolute path to the markdown output directory (resolved from config.outDir).
  outDir: string
  // GitHub "blob" base URL used to link source locations.
  sourceUrl: string
  // The docs entry being generated.
  config: DocsConfig
  // Show underlying tool output (doxygen/moxygen) instead of suppressing it.
  verbose: boolean
}
