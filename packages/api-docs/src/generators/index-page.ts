// Generate a landing `index.md` for a set of generated API-docs pages: reads the
// produced pages (reusing the sidebar grouping) and renders them as a grouped,
// linked outline. Shared by the doxygen (C++) and griffe (Python) generators so
// both landing pages look the same; `options` selects the language conventions
// (segment separator, grouping depth, title source).

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateSidebar } from '../sidebar'
import type { SidebarItem, SidebarOptions } from '../sidebar'

// Render grouped items as a nested markdown bullet list.
function renderItems(items: SidebarItem[], depth: number = 0): string {
  const indent = '  '.repeat(depth)

  return items
    .map((item) => {
      const label =
        item.link !== undefined
          ? `[${item.text ?? item.link}](./${item.link}.md)`
          : (item.text ?? '')
      const children = item.items?.length
        ? `\n${renderItems(item.items, depth + 1)}`
        : ''
      return `${indent}- ${label}${children}`
    })
    .join('\n')
}

// Write `<dir>/index.md` listing every generated page in `dir`, grouped by
// namespace. Does nothing if the directory has no pages.
export async function generateIndex(
  dir: string,
  title: string = 'API Reference',
  options: SidebarOptions = {}
): Promise<void> {
  const items = await generateSidebar(dir, options)
  if (items.length === 0) return

  const frontmatter = '---\noutline: [2, 3]\n---\n'
  const content = `${frontmatter}\n# ${title}\n\n${renderItems(items)}\n`
  await writeFile(join(dir, 'index.md'), content)
}
