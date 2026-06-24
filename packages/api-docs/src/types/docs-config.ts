// A single documentation target within a repo's manifest entry. `type` selects
// the generator; the remaining fields are generator-specific (e.g. doxygen uses
// `xmlPath` and `doxyfile`).
export interface DocsConfig {
  type: string
  outDir: string
  [key: string]: unknown
}
