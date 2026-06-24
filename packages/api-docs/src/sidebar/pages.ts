import { readdir } from 'node:fs/promises'
import type { SidebarItem } from '../types'

function removeExtension(filename: string): string {
  return filename.slice(0, filename.lastIndexOf('.'))
}

// "vda5050_core-client-AGVContext" -> "vda5050_core::client::AGVContext"
function pageTitle(name: string): string {
  return name.replaceAll('-', '::')
}

// One { text, link } entry per markdown page in `dir` (non-recursive).
export async function collectPages(dir: string): Promise<SidebarItem[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'index.md'
    )
    .map((entry) => {
      const name = removeExtension(entry.name)
      return { text: pageTitle(name), link: name }
    })
}
