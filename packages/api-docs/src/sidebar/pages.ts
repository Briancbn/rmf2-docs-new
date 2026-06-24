import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SidebarItem } from '../types'

function removeExtension(filename: string): string {
  return filename.slice(0, filename.lastIndexOf('.'))
}

// The page's symbol name. The filename slug collapses both `::` and template
// `<...>` into `-`, so deriving the name from it turns e.g.
// `error_level_traits< types::ErrorLevel >` into `error_level_traits::types::ErrorLevel`.
// Read the real name from the page's first H1 heading instead (which keeps both),
// falling back to the filename with `-` turned into `::`.
async function pageTitle(filePath: string, filename: string): Promise<string> {
  const content = await readFile(filePath, 'utf8')
  const heading = content.match(/^#\s+(.+)$/m)
  if (heading) {
    // Drop a trailing `{#anchor}` tag (page headings carry one inline).
    return heading[1].replace(/\s*\{#[^}]*\}\s*$/, '').trim()
  }
  return removeExtension(filename).replaceAll('-', '::')
}

// One { text, link } entry per markdown page in `dir` (non-recursive).
export async function collectPages(dir: string): Promise<SidebarItem[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const pages = entries.filter(
    (entry) =>
      entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md'
  )

  return Promise.all(
    pages.map(async (entry) => ({
      text: await pageTitle(join(dir, entry.name), entry.name),
      link: removeExtension(entry.name),
    }))
  )
}
