// Build a VitePress sidebar from generated API-docs markdown. Pages are named
// after their qualified symbol (e.g. "vda5050_core-client-AGVContext.md") and
// grouped by the first `groupDepth` namespace segments.

import { collectPages } from './pages'
import { buildGroupedSidebar } from './group'
import type { SidebarItem } from '../types'

export type { SidebarItem } from '../types'

// Build a grouped VitePress sidebar from the API-docs markdown in `dir`. Pages
// are grouped by the first `groupDepth` `::`-separated segments of their title.
export async function generateSidebar(
  dir: string,
  groupDepth: number = 2
): Promise<SidebarItem[]> {
  const pages = await collectPages(dir)

  const groupData: Record<string, any> = {}
  for (const page of pages) {
    const parts = (page.text ?? '').split('::')
    const groupIds = parts.slice(0, groupDepth)
    const remainder = parts.slice(groupDepth).join('::')

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
