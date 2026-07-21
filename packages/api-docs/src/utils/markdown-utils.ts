// A generated page is "empty" when nothing remains after dropping its frontmatter,
// anchor tag, headings and blank lines — i.e. a bare title with no members, tables
// or description (e.g. a namespace that only contains sub-namespaces).
export function isContentEmpty(markdown: string): boolean {
  // Ignore leading YAML frontmatter (boilerplate, not real content).
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '')

  return body.split('\n').every((line) => {
    const text = line.trim()
    return !text || /^\{#[^}]*\}$/.test(text) || /^#{1,6}\s/.test(text)
  })
}
