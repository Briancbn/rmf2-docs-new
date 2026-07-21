import type { DocsConfig } from './docs-config'

// A repo entry in the manifest: where to clone from and what docs to generate.
export interface RepoInfo {
  name: string
  url: string
  type: string
  version?: string
  docs?: DocsConfig[]
}
