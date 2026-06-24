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
// Splits a line into inline-code spans (kept, as the capture group) and the
// plain text between them.
export const INLINE_CODE = /(`[^`\n]*`)/g
// A `<` that looks like the start of an HTML/Vue tag (followed by a letter or
// `/`). VitePress otherwise parses e.g. `static_cast<int>` as an element and
// fails with "missing end tag". `<` before a space/operator is left alone.
export const TAG_LIKE_ANGLE = /<(?=[A-Za-z/])/g
// The start/end fence of a code block (```), which we must leave untouched.
export const CODE_FENCE = /^\s*```/
