// A generated page is "empty" when nothing remains after dropping its anchor
// tag, headings and blank lines — i.e. a bare title with no members, tables or
// description (e.g. a namespace that only contains sub-namespaces).
export function isContentEmpty(markdown: string): boolean {
  return markdown.split('\n').every((line) => {
    const text = line.trim()
    return !text || /^\{#[^}]*\}$/.test(text) || /^#{1,6}\s/.test(text)
  })
}
