// Shared types for pluggable API-documentation generation. Each language/tool
// implements `ApiDocsGenerator` and registers itself; a docs entry's `type`
// selects which generator runs.

export type { DocsConfig } from './docs-config'
export type { GenerateContext } from './generate-context'
export type { ApiDocsGenerator } from './api-docs-generator'
export type { RepoInfo } from './repo-info'
export type { SidebarItem } from './sidebar-item'
