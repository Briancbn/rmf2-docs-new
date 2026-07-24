import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Read the sidebar title for a markdown module's home page from the `title`
// frontmatter that the `markdown` generator writes onto `index.md`. Falls back
// to `fallback` when the page (or the field) is absent, so config wiring stays
// declarative and does not need to duplicate the manifest value.
export function homePageTitle(
  dir: string,
  fallback: string = 'Introduction'
): string {
  const page = join(dir, 'index.md')
  if (!existsSync(page)) return fallback

  const frontmatter = readFileSync(page, 'utf8').match(/^---\n([\s\S]*?)\n---/)
  const field = frontmatter?.[1].match(/^title:\s*(.+)$/m)
  if (!field) return fallback

  // Unwrap a quoted value (the generator writes JSON-quoted titles).
  const value = field[1].trim()
  try {
    return typeof JSON.parse(value) === 'string' ? JSON.parse(value) : value
  } catch {
    return value.replace(/^['"]|['"]$/g, '')
  }
}
