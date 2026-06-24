// Generate a landing `index.md` for a directory of generated API-docs markdown.
// Generator-agnostic: it reads the produced pages (reusing the sidebar grouping)
// and renders them as a grouped, linked outline.

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateSidebar } from '../sidebar'
import type { SidebarItem } from '../types'

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
  title: string = 'API Reference'
): Promise<void> {
  const items = await generateSidebar(dir)
  if (items.length === 0) return

  const content = `# ${title}\n\n${renderItems(items)}\n`
  await writeFile(join(dir, 'index.md'), content)
}
