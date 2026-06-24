import type { SidebarItem } from '../types'

// Convert the nested group tree into sidebar items (recursive). A node with an
// `items` array is a leaf group; otherwise its keys are nested sub-groups.
export function buildGroupedSidebar(
  group: Record<string, any>,
  out: SidebarItem
): void {
  if ('items' in group) {
    out.link = group.link
    out.items = group.items
    out.collapsed = true
    return
  }

  for (const [key, value] of Object.entries(group)) {
    if (key === 'link') {
      out.link = value as string
      continue
    }
    out.items ??= []
    out.collapsed = true
    const item: SidebarItem = { text: key }
    buildGroupedSidebar(value as Record<string, any>, item)
    out.items.push(item)
  }
}
