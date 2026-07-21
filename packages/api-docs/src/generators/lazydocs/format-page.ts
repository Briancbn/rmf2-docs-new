// Restructure a (cleaned) lazydocs module page into the same shape as the C++
// (moxygen) pages: a title with a `Defined in` source line, `## Classes` /
// `## Functions` summary tables, a `## Detailed Description`, then
// `## Class Documentation` / `## Function Documentation` sections whose entries
// carry `{#anchor}` ids, code-span modifier badges, signature blocks and
// `**Args:**`-derived parameter tables — mirroring `moxygen-templates/cpp`.
//
// lazydocs emits one page per module with classes and functions inlined (unlike
// doxygen's page-per-class), so classes render as `###` entries and their
// members as `####` entries under a single `## Class Documentation` section.

// A heading line produced by `cleanLazydocs`, e.g.
// `## <Badge type="info" text="class" /> \`Name\``. The name backticks are
// optional — lazydocs omits them for some property headings.
const HEADING =
  /^(#{1,6})\s+<Badge\b[^>]*\btext="([^"]+)"[^>]*\/>\s*`?([^`\n]+?)`?\s*$/
// A `cleanLazydocs` source link, e.g. `[source](https://.../foo.py#L42)`.
const SOURCE = /^\[source\]\(([^)]+)\)\s*$/
// A horizontal rule / setext underline (lazydocs separates symbols with `---`).
const RULE = /^-{3,}$/
const FENCE = /^```/
// A Google-style arg line, e.g. ` - <b>\`name\`</b> (Type):  description`.
const ARG = /^\s*-\s*<b>`([^`]+)`<\/b>\s*(?:\(([^)]*)\))?\s*:\s+(.*\S)\s*$/

// One documented symbol (function, method, property, …).
interface Member {
  kind: string
  name: string
  signature?: string
  doc: string
  source?: string
}

interface ClassDoc {
  name: string
  doc: string
  source?: string
  members: Member[]
}

interface ModuleDoc {
  name: string
  doc: string
  source?: string
  globals: GlobalVar[]
  classes: ClassDoc[]
  functions: Member[]
}

// A module-level name from the lazydocs `**Global Variables**` block.
interface GlobalVar {
  name: string
  desc?: string
}

interface RawSymbol {
  level: number
  kind: string
  name: string
  source?: string
  body: string[]
}

// Split the page into raw symbols keyed by their heading. The `[source]` link
// lazydocs places immediately before each heading is attached to that symbol;
// `---` separators are dropped.
function tokenize(markdown: string): RawSymbol[] {
  const symbols: RawSymbol[] = []
  let pendingSource: string | undefined
  let current: RawSymbol | null = null
  let inFence = false

  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) {
      inFence = !inFence
      current?.body.push(line)
      continue
    }
    if (!inFence) {
      const heading = line.match(HEADING)
      if (heading) {
        current = {
          level: heading[1].length,
          kind: heading[2],
          name: heading[3],
          source: pendingSource,
          body: [],
        }
        symbols.push(current)
        pendingSource = undefined
        continue
      }
      const source = line.match(SOURCE)
      if (source) {
        pendingSource = source[1]
        continue
      }
      if (RULE.test(line.trim())) continue
    }
    current?.body.push(line)
  }
  return symbols
}

// Pull a leading ```python signature block (if any) off a symbol body; the rest
// is the docstring.
function splitBody(body: string[]): { signature?: string; doc: string } {
  let i = 0
  while (i < body.length && body[i].trim() === '') i++

  let signature: string | undefined
  if (body[i]?.startsWith('```')) {
    const code: string[] = []
    let j = i + 1
    while (j < body.length && !body[j].startsWith('```')) code.push(body[j++])
    signature = code.join('\n').trim()
    i = j + 1
  }
  return { signature, doc: body.slice(i).join('\n').trim() }
}

function toMember(raw: RawSymbol): Member {
  const { signature, doc } = splitBody(raw.body)
  return { kind: raw.kind, name: raw.name, signature, doc, source: raw.source }
}

// lazydocs appends a `**Global Variables**` block to the module docstring, one
// `- **name**` entry per module-level name, optionally followed by `: <doc>`.
// The block is always last, so everything from the marker on belongs to it.
const GLOBALS_MARKER = /^\*\*Global Variables\*\*\s*$/
const GLOBAL_ENTRY = /^-\s+\*\*(\w+)\*\*(?::\s*(.*))?$/

// Split the trailing `**Global Variables**` block off a module docstring.
// For a re-exported submodule lazydocs uses the submodule's leading comment as
// its "doc", which is the Apache licence header — a wall of boilerplate on every
// package page. Continuation lines and any `#`-comment value are dropped, so
// such an entry keeps its name and loses the licence text.
function splitGlobals(doc: string): { doc: string; globals: GlobalVar[] } {
  const lines = doc.split('\n')
  const start = lines.findIndex((line) => GLOBALS_MARKER.test(line.trim()))
  if (start === -1) return { doc, globals: [] }

  const globals: GlobalVar[] = []
  for (const line of lines.slice(start + 1)) {
    const entry = line.match(GLOBAL_ENTRY)
    if (!entry) continue
    const desc = entry[2]?.trim()
    globals.push({
      name: entry[1],
      desc: desc && !desc.startsWith('#') ? desc : undefined,
    })
  }
  return { doc: lines.slice(0, start).join('\n').trim(), globals }
}

// Group the flat symbol list into a module with its classes (and their members)
// and top-level functions.
function buildModule(symbols: RawSymbol[]): ModuleDoc | null {
  if (symbols.length === 0) return null

  const head = symbols[0]
  const { doc: rawDoc } = splitBody(head.body)
  const { doc, globals } = splitGlobals(rawDoc)
  const module: ModuleDoc = {
    name: head.name,
    doc,
    source: head.source,
    globals,
    classes: [],
    functions: [],
  }

  let openClass: ClassDoc | null = null
  for (const raw of symbols.slice(1)) {
    if (raw.level <= 2 && raw.kind === 'class') {
      const { doc: classDoc } = splitBody(raw.body)
      openClass = {
        name: raw.name,
        // Drop the auto-generated `ClassName(field: type, …)` repr that
        // dataclasses/NamedTuples carry as their docstring — the attributes
        // table renders those fields with their types instead.
        doc: isReprDoc(raw.name, classDoc) ? '' : classDoc,
        source: raw.source,
        members: [],
      }
      module.classes.push(openClass)
    } else if (raw.level <= 2) {
      openClass = null
      module.functions.push(toMember(raw))
    } else if (openClass) {
      // Skip the pydantic BaseModel internals lazydocs surfaces on every model.
      if (!PYDANTIC_INHERITED.has(raw.name))
        openClass.members.push(toMember(raw))
    } else {
      module.functions.push(toMember(raw))
    }
  }
  return module
}

// pydantic BaseModel members lazydocs documents on every subclass — inherited
// machinery, not part of the model's own API.
const PYDANTIC_INHERITED = new Set([
  'model_extra',
  'model_fields_set',
  'model_computed_fields',
  'model_fields',
  'model_config',
])

// True when a class docstring is just the synthesized `ClassName(…)` repr that
// dataclasses and NamedTuples carry when they have no real docstring.
function isReprDoc(name: string, doc: string): boolean {
  const text = doc.trim()
  return text.startsWith(`${name}(`) && text.endsWith(')')
}

// --- rendering ---------------------------------------------------------------

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Escape a value for use in a markdown table cell (pipes break the table; code
// spans must escape their pipes too, e.g. `str | None`).
const cell = (text: string): string =>
  text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()

const codeCell = (text: string): string => cell(`\`${text}\``)

// First paragraph of a docstring, flattened — used for summary-table cells.
const brief = (doc: string): string =>
  (doc.split(/\n\s*\n/)[0] ?? '').replace(/\s+/g, ' ').trim()

// `Defined in [path:line](href)`, matching the C++ pages. Skipped for the
// synthetic `<string>` locations lazydocs emits for generated dataclass methods.
function definedIn(source?: string): string {
  if (!source || source.includes('<string>') || source.includes('&lt;string'))
    return ''
  const match = source.match(/\/blob\/[^/]+\/(.+?)(?:#L(\d+))?$/)
  if (!match) return `Defined in ${source}`
  const [, path, line] = match
  const label = line && line !== '0' ? `${path}:${line}` : path
  return `Defined in [${label}](${source})`
}

// Render a docstring, turning a `**Args:**` block into a C++-style parameter
// table while leaving the rest of the prose (Returns/Raises/etc.) untouched.
function renderDoc(doc: string): string {
  if (!doc.trim()) return ''

  const out: string[] = []
  let params: Array<{ name: string; type: string; desc: string }> = []
  let inArgs = false

  const flushParams = () => {
    if (params.length === 0) return
    out.push(
      '',
      '| Parameter | Type | Description |',
      '|-----------|------|-------------|',
      ...params.map(
        (p) =>
          `| ${codeCell(p.name)} | ${p.type ? codeCell(p.type) : ''} | ${cell(p.desc)} |`
      ),
      ''
    )
    params = []
  }

  for (const line of doc.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '**Args:**') {
      flushParams()
      inArgs = true
      continue
    }
    if (inArgs) {
      const arg = line.match(ARG)
      if (arg) {
        params.push({ name: arg[1], type: arg[2] ?? '', desc: arg[3] })
        continue
      }
      if (trimmed === '') continue
      flushParams()
      inArgs = false
    }
    out.push(line)
  }
  flushParams()
  return out.join('\n').trim()
}

// A `### name` (class/function) or `#### name` (member) detail entry, prefixed by
// a `---` rule and `{#anchor}` like the C++ member-detail partial.
function renderEntry(
  level: '###' | '####',
  anchor: string,
  name: string,
  signature: string | undefined,
  source: string | undefined,
  doc: string,
  badge?: string
): string {
  const parts = ['---', '', `{#${anchor}}`, '', `${level} ${name}`, '']
  if (badge) parts.push(`\`${badge}\``, '')
  if (signature) parts.push('```python', signature, '```', '')
  const defined = definedIn(source)
  if (defined) parts.push(defined, '')
  const body = renderDoc(doc)
  if (body) parts.push(body, '')
  return parts.join('\n')
}

// Modifier badge for a member kind. Plain methods/functions get none (their
// section conveys the kind); property/classmethod/staticmethod/async are shown
// as a code span, mirroring the C++ `static`/`explicit` badges.
const memberBadge = (kind: string): string | undefined =>
  kind === 'method' || kind === 'function' ? undefined : kind

function summaryTable(
  title: string,
  rows: Array<{ label: string; anchor: string; desc: string }>
): string {
  return [
    `## ${title}`,
    '',
    '| Name | Description |',
    '|------|-------------|',
    ...rows.map(
      (r) => `| [${codeCell(r.label)}](#${r.anchor}) | ${cell(r.desc)} |`
    ),
    '',
  ].join('\n')
}

// Collapse a (possibly multi-line) signature to a single line for table cells.
const oneLine = (signature: string): string =>
  signature.replace(/\s+/g, ' ').trim()

// A class-level annotated field (dataclass / pydantic / annotated class).
interface Field {
  name: string
  type: string
  default?: string
  desc?: string
}

const lineOf = (url: string): number | undefined => {
  const match = url.match(/#L(\d+)$/)
  return match ? Number(match[1]) : undefined
}

// Parse a class's base list and annotated fields straight from the Python
// source — lazydocs omits field types entirely for pydantic models and only
// exposes them through the noisy generated repr for dataclasses.
function parseClass(
  source: string,
  className: string,
  line?: number
): { bases: string[]; fields: Field[] } | null {
  const lines = source.split('\n')
  const classRe = new RegExp(`^(\\s*)class\\s+${className}\\b`)

  // Prefer the documented line number; fall back to the first matching class.
  let start = -1
  if (
    line &&
    line >= 1 &&
    line <= lines.length &&
    classRe.test(lines[line - 1])
  ) {
    start = line - 1
  } else {
    start = lines.findIndex((l) => classRe.test(l))
  }
  if (start === -1) return null

  const classIndent = lines[start].match(/^(\s*)/)![1].length
  const bases = (
    lines[start].match(/^\s*class\s+\w+\s*\(([^)]*)\)\s*:/)?.[1] ?? ''
  )
    .split(',')
    .map((base) => base.trim())
    .filter((base) => base && !base.includes('='))

  const fields: Field[] = []
  let bodyIndent = -1
  let inDoc = false
  let docQuote = ''

  for (let i = start + 1; i < lines.length; i += 1) {
    const raw = lines[i]
    if (raw.trim() === '') continue
    const indent = raw.match(/^(\s*)/)![1].length
    if (indent <= classIndent) break // dedent out of the class body

    if (inDoc) {
      if (raw.includes(docQuote)) inDoc = false
      continue
    }
    const docStart = raw.trim().match(/^(?:r|b|f|rb|fr)?("""|''')/i)
    if (docStart) {
      const quote = docStart[1]
      const afterOpen = raw.trim().slice(raw.trim().indexOf(quote) + 3)
      if (!afterOpen.includes(quote)) {
        inDoc = true
        docQuote = quote
      }
      continue
    }

    if (bodyIndent === -1) bodyIndent = indent
    if (indent !== bodyIndent) continue // nested (e.g. a method body)

    const trimmed = raw.trim()
    if (
      trimmed.startsWith('@') ||
      trimmed.startsWith('def ') ||
      trimmed.startsWith('class ') ||
      trimmed.startsWith('#')
    )
      continue

    const match = trimmed.match(
      /^([A-Za-z_]\w*)\s*:\s*([^=#]+?)\s*(?:=\s*([^#]+?))?\s*(?:#\s*(.*))?$/
    )
    if (!match) continue
    const type = match[2].trim()
    if (type.startsWith('ClassVar')) continue
    fields.push({
      name: match[1],
      type,
      default: match[3]?.trim(),
      desc: match[4]?.trim(),
    })
  }
  return { bases, fields }
}

// Attributes table for a class's fields, mirroring the C++ "Public Attributes"
// section. The Description column is only emitted when a field has an inline
// comment.
function renderFields(fields: Field[]): string {
  const hasDesc = fields.some((f) => f.desc)
  const header = hasDesc
    ? [
        '| Name | Type | Default | Description |',
        '|------|------|---------|-------------|',
      ]
    : ['| Name | Type | Default |', '|------|------|---------|']
  const rows = fields.map((f) => {
    const cells = [
      codeCell(f.name),
      codeCell(f.type),
      f.default ? codeCell(f.default) : '',
    ]
    if (hasDesc) cells.push(cell(f.desc ?? ''))
    return `| ${cells.join(' | ')} |`
  })
  return ['#### Attributes', '', ...header, ...rows, ''].join('\n')
}

function render(
  module: ModuleDoc,
  readSource?: (url: string) => string | undefined
): string {
  const out: string[] = [`{#${slug(module.name)}}`, '', `# ${module.name}`, '']

  const defined = definedIn(module.source)
  if (defined) out.push(defined, '')

  const summary = brief(module.doc)
  if (summary) out.push(summary, '')

  if (module.classes.length > 0) {
    out.push(
      summaryTable(
        'Classes',
        module.classes.map((c) => ({
          label: c.name,
          anchor: slug(c.name),
          desc: brief(c.doc),
        }))
      )
    )
  }

  if (module.functions.length > 0) {
    out.push(
      summaryTable(
        'Functions',
        module.functions.map((f) => ({
          label: f.signature ? oneLine(f.signature) : `${f.name}()`,
          anchor: slug(f.name),
          desc: brief(f.doc),
        }))
      )
    )
  }

  if (module.globals.length > 0) {
    out.push(
      '## Global Variables',
      '',
      ...module.globals.map((g) =>
        g.desc ? `- \`${g.name}\` — ${cell(g.desc)}` : `- \`${g.name}\``
      ),
      ''
    )
  }

  // Module docstring beyond its first paragraph.
  const rest = renderDoc(
    module.doc
      .split(/\n\s*\n/)
      .slice(1)
      .join('\n\n')
  )
  if (rest) out.push('## Detailed Description', '', rest, '')

  if (module.classes.length > 0) {
    out.push('## Class Documentation', '')
    for (const cls of module.classes) {
      const parsed =
        readSource && cls.source
          ? parseClass(
              readSource(cls.source) ?? '',
              cls.name,
              lineOf(cls.source)
            )
          : null
      const signature = parsed?.bases.length
        ? `class ${cls.name}(${parsed.bases.join(', ')})`
        : `class ${cls.name}`
      out.push(
        renderEntry(
          '###',
          slug(cls.name),
          cls.name,
          signature,
          cls.source,
          cls.doc
        )
      )
      if (parsed?.fields.length) out.push(renderFields(parsed.fields))
      for (const member of cls.members) {
        out.push(
          renderEntry(
            '####',
            slug(`${cls.name}-${member.name}`),
            member.name,
            member.signature,
            member.source,
            member.doc,
            memberBadge(member.kind)
          )
        )
      }
    }
  }

  if (module.functions.length > 0) {
    out.push('## Function Documentation', '')
    for (const fn of module.functions) {
      out.push(
        renderEntry(
          '###',
          slug(fn.name),
          fn.name,
          fn.signature,
          fn.source,
          fn.doc
        )
      )
    }
  }

  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}

// Options for `formatModulePage`.
export interface FormatOptions {
  // Resolve a class's `[source]` URL to the local Python source, so field types
  // and base classes can be read straight from the code.
  readSource?: (url: string) => string | undefined
}

// Restructure a cleaned lazydocs module page into C++-style markdown. Returns
// null when the module has no documentable content (so the caller can drop the
// page, matching the doxygen generator's empty-page removal).
export function formatModulePage(
  markdown: string,
  options: FormatOptions = {}
): string | null {
  const module = buildModule(tokenize(markdown))
  if (
    !module ||
    (!module.doc.trim() &&
      module.globals.length === 0 &&
      module.classes.length === 0 &&
      module.functions.length === 0)
  ) {
    return null
  }
  return render(module, options.readSource)
}
