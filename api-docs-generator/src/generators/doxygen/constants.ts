// Shared constants for the doxygen formatters, handlers and member categories.

// Member kinds treated as functions (for signatures and categorization).
export const FUNCTION_KINDS = new Set(['function', 'signal', 'slot'])

// Member sections that document types — rendered before functions/attributes.
export const TYPE_SECTIONS = new Set([
  'public-type',
  'protected-type',
  'private-type',
])

// Collapse a table argument list to `(...)` once the parameters exceed this.
export const MAX_TABLE_ARGS = 40

// A markdown link, e.g. `[text](url)`.
export const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)]*)\)/
// An inline-code span whose contents include a markdown link.
export const CODE_SPAN_WITH_LINK = /`([^`\n]*\]\([^`\n]*)`/g
// The start/end fence of a code block (```), which we must leave untouched.
export const CODE_FENCE = /^\s*```/
