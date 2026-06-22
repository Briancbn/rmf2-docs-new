// Pluggable API-documentation generation.
//
// Each language/tool (doxygen for C++ today; sphinx for Python, rustdoc for Rust
// in future) implements `ApiDocsGenerator` and registers itself. A docs entry's
// `type` selects which generator runs.

// A single documentation target within a repo's manifest entry. `type` selects
// the generator; the remaining fields are generator-specific (e.g. doxygen uses
// `xmlPath` and `doxyfile`).
export interface DocsConfig {
  type: string
  outDir: string
  [key: string]: unknown
}

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
}

// A generator for one documentation `type`.
export interface ApiDocsGenerator {
  readonly type: string
  generate(context: GenerateContext): Promise<void>
}
