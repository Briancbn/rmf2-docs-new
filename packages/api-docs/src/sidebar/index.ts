// Build a VitePress sidebar from generated API-docs markdown. Pages are named
// after their qualified symbol and grouped by the first `groupDepth` segments —
// "::" for C++ (doxygen), "." for Python (griffe).

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
  // How many nesting levels these items may occupy in the rendered sidebar,
  // counting the outermost generated group as one. See `MAX_RENDERED_DEPTH`.
  maxDepth?: number
}

// VitePress's default theme renders a sidebar item's children only while
// `depth < 5` (VPSidebarItem.vue), so anything past the sixth level is dropped
// from the page without any build error. Grouping is capped to stay inside that
// budget: surplus segments stay in the item's text (e.g. `plan.Plan`) instead of
// becoming levels that would never be rendered.
const MAX_RENDERED_DEPTH = 6

// Build a grouped VitePress sidebar from the API-docs markdown in `dir`.
export async function generateSidebar(
  dir: string,
  options: SidebarOptions = {}
): Promise<SidebarItem[]> {
  const {
    separator = '::',
    groupDepth = 2,
    fromFilename = false,
    maxDepth = MAX_RENDERED_DEPTH,
  } = options
  const pages = await collectPages(dir, fromFilename)

  // A grouped page occupies one level per group plus one for the item itself.
  const depth = Math.max(1, Math.min(groupDepth, maxDepth - 1))

  // Order by qualified-name segments so a page sorts before the pages nested
  // under it (`plan` before `plan.Plan`), which raw filename order gets wrong.
  const sorted = [...pages].sort((a, b) => {
    const left = (a.text ?? '').split(separator)
    const right = (b.text ?? '').split(separator)
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1
    }
    return left.length - right.length
  })

  const groupData: Record<string, any> = {}
  for (const page of sorted) {
    const parts = (page.text ?? '').split(separator)
    const groupIds = parts.slice(0, depth)
    const remainder = parts.slice(depth).join(separator)

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
