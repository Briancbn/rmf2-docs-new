// Build a VitePress sidebar from generated API-docs markdown. Pages are named
// after their qualified symbol and grouped by the first `groupDepth` segments —
// "::" for C++ (doxygen), "." for Python (lazydocs).

import { collectPages } from './pages'
import { buildGroupedSidebar } from './group'
import type { SidebarItem } from '../types'

export type { SidebarItem } from '../types'

export interface SidebarOptions {
  // Separator between qualified-name segments ("::" for C++, "." for Python).
  separator?: string
  // Group by the first N segments.
  groupDepth?: number
  // Derive titles from filenames instead of each page's H1 heading.
  fromFilename?: boolean
}

// Build a grouped VitePress sidebar from the API-docs markdown in `dir`.
export async function generateSidebar(
  dir: string,
  options: SidebarOptions = {}
): Promise<SidebarItem[]> {
  const { separator = '::', groupDepth = 2, fromFilename = false } = options
  const pages = await collectPages(dir, fromFilename)

  const groupData: Record<string, any> = {}
  for (const page of pages) {
    const parts = (page.text ?? '').split(separator)
    const groupIds = parts.slice(0, groupDepth)
    const remainder = parts.slice(groupDepth).join(separator)

    const entry = groupIds.reduce<Record<string, any>>((node, id) => {
      node[id] ??= {}
      return node[id]
    }, groupData)

    if (remainder === '') {
      entry.link = page.link
      continue
    }
    entry.items ??= []
    entry.items.push({ link: page.link, text: remainder })
  }

  const sidebar: SidebarItem = {}
  buildGroupedSidebar(groupData, sidebar)
  const items = sidebar.items ?? []

  // Drop a redundant common root: when everything sits under a single root
  // namespace (e.g. "vda5050_core"), start the sidebar at its children.
  if (items.length === 1 && items[0].link === undefined && items[0].items) {
    return items[0].items
  }
  return items
}
