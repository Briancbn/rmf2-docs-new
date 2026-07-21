// Parse a Google-style docstring into prose plus its typed sections, so the
// renderer can turn `Args:` into a parameter table like the C++ pages do.
//
// `griffe dump` emits docstrings as raw text (its `--docstyle` only affects
// warnings, not the JSON), so the sectioning happens here.

export interface DocParam {
  name: string
  type?: string
  desc: string
}

export interface DocEntry {
  type?: string
  desc: string
}

export interface Docstring {
  // Prose outside the recognised sections, in source order.
  text: string
  params: DocParam[]
  returns: DocEntry[]
  raises: DocEntry[]
}

export const EMPTY_DOC: Docstring = {
  text: '',
  params: [],
  returns: [],
  raises: [],
}

// A section heading, e.g. `Args:` or `Returns:`. Google style allows a few
// spellings of each.
const SECTION = /^([A-Z][A-Za-z ]*):\s*$/
const PARAM_SECTIONS = new Set([
  'args',
  'arguments',
  'parameters',
  'keyword args',
])
const RETURN_SECTIONS = new Set(['returns', 'return', 'yields', 'yield'])
const RAISE_SECTIONS = new Set(['raises', 'raise', 'except', 'exceptions'])

// `name (Type): description` — the type is optional.
const PARAM_ENTRY = /^(\*{0,2}\w+)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/
// `Type: description` — a Returns/Raises entry. The type is optional for
// Returns (a bare description is common) but always present for Raises.
const ENTRY = /^([\w.[\], |]*?)\s*:\s*(.*)$/

// Strip the common leading indentation from a docstring body.
function dedent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.length - line.trimStart().length)
  const common = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(common))
}

export function parseDocstring(raw: string | undefined): Docstring {
  if (!raw?.trim()) return EMPTY_DOC

  const doc: Docstring = { text: '', params: [], returns: [], raises: [] }
  const prose: string[] = []

  // Split into a heading-less preamble plus one block per `Section:` heading.
  let heading: string | null = null
  let block: string[] = []

  const flush = () => {
    const body = dedent(block)
    const key = heading?.trim().toLowerCase() ?? ''

    if (heading === null) {
      prose.push(body.join('\n'))
    } else if (PARAM_SECTIONS.has(key)) {
      for (const { head, rest } of entries(body)) {
        const match = head.match(PARAM_ENTRY)
        if (match) {
          doc.params.push({
            name: match[1],
            type: match[2]?.trim() || undefined,
            desc: [match[3], ...rest].join(' ').trim(),
          })
        }
      }
    } else if (RETURN_SECTIONS.has(key) || RAISE_SECTIONS.has(key)) {
      const target = RETURN_SECTIONS.has(key) ? doc.returns : doc.raises
      for (const { head, rest } of entries(body)) {
        const match = head.match(ENTRY)
        target.push(
          match && match[1]
            ? { type: match[1], desc: [match[2], ...rest].join(' ').trim() }
            : { desc: [head, ...rest].join(' ').trim() }
        )
      }
    } else {
      // An unrecognised section (Example, Note, …) stays as prose, keeping its
      // heading so the page still reads correctly.
      prose.push(`**${heading}**\n\n${body.join('\n')}`)
    }
    block = []
  }

  for (const line of raw.split('\n')) {
    const section = line.trim().match(SECTION)
    if (section) {
      flush()
      heading = section[1]
      continue
    }
    block.push(line)
  }
  flush()

  doc.text = prose
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()
  return doc
}

// Group a section body into entries: a non-indented line starts an entry, more
// deeply indented lines continue it.
function entries(lines: string[]): Array<{ head: string; rest: string[] }> {
  const out: Array<{ head: string; rest: string[] }> = []
  for (const line of lines) {
    if (!line.trim()) continue
    const indented = /^\s/.test(line)
    if (!indented || out.length === 0) {
      out.push({ head: line.trim(), rest: [] })
    } else {
      out[out.length - 1].rest.push(line.trim())
    }
  }
  return out
}
