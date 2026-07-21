// Render a griffe package tree into markdown organised like the C++ (moxygen)
// pages: one page per class, plus one page per module playing the role a
// namespace page plays in C++.
//
// A module page carries the module's own free functions and attributes and
// links out to its classes; a class page carries that class's attributes and
// methods, its base classes ("Inherits") and its known subclasses ("Subclassed
// by"). Pages are named after the fully-qualified symbol, so the sidebar nests
// classes under their module.

import { memberKind, signature, stringify, tableSignature } from './dump'
import type { DumpNode } from './dump'
import { parseDocstring } from './docstring'
import type { DocParam, Docstring } from './docstring'

// One module of the dump, with the source path used for its links.
export interface ModuleEntry {
  node: DumpNode
  // Fully-qualified module name, e.g. `res_mapf_planning.cbs.a_star`.
  name: string
  // Module path relative to the repo root, for source links.
  path: string
}

export interface RenderedPage {
  // Page basename without the extension, i.e. the fully-qualified symbol.
  name: string
  kind: 'module' | 'class'
  content: string
}

// Where a documented class lives, so other pages can link to it.
interface ClassRef {
  qualname: string
  name: string
  page: string
  anchor: string
}

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
const brief = (doc: Docstring): string =>
  (doc.text.split(/\n\s*\n/)[0] ?? '').replace(/\s+/g, ' ').trim()

// Plain methods and functions get no badge — their section already conveys the
// kind. Everything else (property, static/class/abstract method) renders as a
// code span, mirroring the C++ `static`/`virtual` badges.
const badgeFor = (kind: string): string | undefined =>
  kind === 'method' || kind === 'function' || kind === 'constructor'
    ? undefined
    : kind

function definedIn(sourceUrl: string, path: string, lineno?: number): string {
  const anchor = lineno ? `#L${lineno}` : ''
  const label = lineno ? `${path}:${lineno}` : path
  return `Defined in [${label}](${sourceUrl}/${path}${anchor})`
}

// Members of a module or class, split by kind. Names imported from elsewhere
// (`kind: 'alias'`) and private names are left out; submodules get their own
// page, so they are not listed here either.
function partition(node: DumpNode) {
  const classes: DumpNode[] = []
  const functions: DumpNode[] = []
  const attributes: DumpNode[] = []

  for (const member of Object.values(node.members ?? {})) {
    if (member.kind === 'alias' || member.kind === 'module') continue
    if (member.name.startsWith('_') && member.name !== '__init__') continue
    if (member.kind === 'class') classes.push(member)
    else if (member.kind === 'function') functions.push(member)
    else if (member.kind === 'attribute') attributes.push(member)
  }
  return { classes, functions, attributes }
}

function summaryTable(title: string, rows: string[]): string[] {
  return [
    `## ${title}`,
    '',
    '| Name | Description |',
    '|------|-------------|',
    ...rows,
    '',
  ]
}

// A `| Parameter | Type | Description |` table from a parsed `Args:` section.
function paramTable(params: DocParam[]): string[] {
  return [
    '',
    '| Parameter | Type | Description |',
    '|-----------|------|-------------|',
    ...params.map(
      (p) =>
        `| ${codeCell(p.name)} | ${p.type ? codeCell(p.type) : ''} | ${cell(p.desc)} |`
    ),
    '',
  ]
}

// Prose plus any parsed Args/Returns/Raises sections.
function renderDoc(doc: Docstring): string[] {
  const out: string[] = []
  if (doc.text) out.push(doc.text, '')
  if (doc.params.length) out.push(...paramTable(doc.params))
  for (const [title, items] of [
    ['Returns', doc.returns],
    ['Raises', doc.raises],
  ] as const) {
    if (!items.length) continue
    out.push(
      `**${title}:**`,
      '',
      ...items.map((item) =>
        item.type
          ? `- \`${item.type}\` — ${cell(item.desc)}`
          : `- ${cell(item.desc)}`
      ),
      ''
    )
  }
  return out
}

// A `### name` detail entry, prefixed by a `---` rule and `{#anchor}` like the
// C++ member-detail partial.
function renderEntry(
  anchor: string,
  name: string,
  code: string,
  lineno: number | undefined,
  doc: Docstring,
  sourceUrl: string,
  path: string,
  badge?: string
): string[] {
  const out = ['---', '', `{#${anchor}}`, '', `### ${name}`, '']
  if (badge) out.push(`\`${badge}\``, '')
  out.push('```python', code, '```', '')
  // A synthesized member (a dataclass `__init__`) has no line of its own.
  out.push(definedIn(sourceUrl, path, lineno), '')
  out.push(...renderDoc(doc))
  return out
}

// An attributes table, mirroring the C++ "Public Attributes" section.
function attributeTable(title: string, attributes: DumpNode[]): string[] {
  const rows = attributes.map((attr) => {
    const doc = parseDocstring(attr.docstring?.value)
    return [
      codeCell(attr.name),
      attr.annotation ? codeCell(stringify(attr.annotation)) : '',
      attr.value ? codeCell(stringify(attr.value)) : '',
      cell(doc.text),
    ]
  })
  const hasDesc = rows.some((row) => row[3])
  return [
    `## ${title}`,
    '',
    hasDesc
      ? '| Name | Type | Default | Description |'
      : '| Name | Type | Default |',
    hasDesc
      ? '|------|------|---------|-------------|'
      : '|------|------|---------|',
    ...rows.map(
      (row) => `| ${(hasDesc ? row : row.slice(0, 3)).join(' | ')} |`
    ),
    '',
  ]
}

// Render one class onto its own page.
function renderClassPage(
  cls: DumpNode,
  qualname: string,
  entry: ModuleEntry,
  sourceUrl: string,
  index: Map<string, ClassRef>,
  subclasses: Map<string, ClassRef[]>
): RenderedPage {
  const { attributes, functions } = partition(cls)
  const doc = parseDocstring(cls.docstring?.value)
  const bases = (cls.bases ?? []).map(stringify).filter(Boolean)

  const link = (ref: ClassRef) =>
    `[\`${ref.name}\`](${ref.page}.md#${ref.anchor})`
  // Bases are written as they appear in the source (`Action`, `abc.ABC`), so
  // resolve them by their last segment and only link an unambiguous match.
  const resolve = (name: string): ClassRef | undefined =>
    index.get(name.split('.').pop() ?? name)

  const out: string[] = [
    `{#${slug(cls.name)}}`,
    '',
    `# ${qualname}`,
    '',
    '```python',
    `class ${cls.name}${bases.length ? `(${bases.join(', ')})` : ''}`,
    '```',
    '',
    definedIn(sourceUrl, entry.path, cls.lineno),
    '',
  ]

  if (bases.length) {
    out.push(
      `> **Inherits:** ${bases
        .map((base) => {
          const ref = resolve(base)
          return ref ? link(ref) : `\`${base}\``
        })
        .join(', ')}`,
      ''
    )
  }
  const derived = subclasses.get(qualname)
  if (derived?.length) {
    out.push(`> **Subclassed by:** ${derived.map(link).join(', ')}`, '')
  }

  const summary = brief(doc)
  if (summary) out.push(summary, '')

  if (attributes.length) out.push(...attributeTable('Attributes', attributes))

  if (functions.length) {
    out.push(
      ...summaryTable(
        'Methods',
        functions.map((fn) => {
          const badge = badgeFor(memberKind(fn))
          return `| [${codeCell(tableSignature(fn))}](#${slug(fn.name)})${
            badge ? ` \`${badge}\`` : ''
          } | ${cell(brief(parseDocstring(fn.docstring?.value)))} |`
        })
      )
    )
  }

  const rest = doc.text
    .split(/\n\s*\n/)
    .slice(1)
    .join('\n\n')
    .trim()
  if (rest) out.push('## Detailed Description', '', rest, '')

  // Split constructor and methods into their own sections, as the C++ pages do.
  const constructors = functions.filter(
    (fn) => memberKind(fn) === 'constructor'
  )
  const methods = functions.filter((fn) => memberKind(fn) !== 'constructor')

  for (const [title, group] of [
    ['Constructor Documentation', constructors],
    ['Method Documentation', methods],
  ] as const) {
    if (!group.length) continue
    out.push(`## ${title}`, '')
    for (const fn of group) {
      out.push(
        ...renderEntry(
          slug(fn.name),
          fn.name,
          signature(fn),
          fn.lineno,
          parseDocstring(fn.docstring?.value),
          sourceUrl,
          entry.path,
          badgeFor(memberKind(fn))
        )
      )
    }
  }

  return { name: qualname, kind: 'class', content: finish(out) }
}

// Render a module page: the Python analogue of a C++ namespace page.
function renderModulePage(
  entry: ModuleEntry,
  sourceUrl: string,
  classRefs: ClassRef[]
): RenderedPage | null {
  const { classes, functions, attributes } = partition(entry.node)
  const doc = parseDocstring(entry.node.docstring?.value)
  if (!doc.text && !classes.length && !functions.length && !attributes.length)
    return null

  const out: string[] = [
    `{#${slug(entry.name)}}`,
    '',
    `# ${entry.name}`,
    '',
    definedIn(sourceUrl, entry.path),
    '',
  ]

  const summary = brief(doc)
  if (summary) out.push(summary, '')

  if (classRefs.length) {
    out.push(
      ...summaryTable(
        'Classes',
        classRefs.map((ref, i) => {
          const cls = classes[i]
          return `| [${codeCell(ref.name)}](${ref.page}.md#${ref.anchor}) | ${cell(
            brief(parseDocstring(cls.docstring?.value))
          )} |`
        })
      )
    )
  }

  if (functions.length) {
    out.push(
      ...summaryTable(
        'Functions',
        functions.map(
          (fn) =>
            `| [${codeCell(tableSignature(fn))}](#${slug(fn.name)}) | ${cell(
              brief(parseDocstring(fn.docstring?.value))
            )} |`
        )
      )
    )
  }

  if (attributes.length)
    out.push(...attributeTable('Module Attributes', attributes))

  const rest = doc.text
    .split(/\n\s*\n/)
    .slice(1)
    .join('\n\n')
    .trim()
  if (rest) out.push('## Detailed Description', '', rest, '')

  if (functions.length) {
    out.push('## Function Documentation', '')
    for (const fn of functions) {
      out.push(
        ...renderEntry(
          slug(fn.name),
          fn.name,
          signature(fn),
          fn.lineno,
          parseDocstring(fn.docstring?.value),
          sourceUrl,
          entry.path
        )
      )
    }
  }

  return { name: entry.name, kind: 'module', content: finish(out) }
}

const finish = (lines: string[]): string =>
  lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'

// Render every module and class in the dump. Cross-page links (a module's class
// list, a class's bases and subclasses) need the full set up front, so this
// indexes the classes before rendering anything.
export function renderPages(
  modules: ModuleEntry[],
  sourceUrl: string
): RenderedPage[] {
  const byModule = new Map<string, ClassRef[]>()
  // Keyed by simple name so a base written as `Action` resolves; a name defined
  // by more than one module is dropped rather than linked to the wrong page.
  const index = new Map<string, ClassRef>()
  const ambiguous = new Set<string>()

  for (const entry of modules) {
    const refs = partition(entry.node).classes.map((cls) => ({
      qualname: `${entry.name}.${cls.name}`,
      name: cls.name,
      page: `${entry.name}.${cls.name}`,
      anchor: slug(cls.name),
    }))
    byModule.set(entry.name, refs)
    for (const ref of refs) {
      if (index.has(ref.name)) ambiguous.add(ref.name)
      index.set(ref.name, ref)
    }
  }
  for (const name of ambiguous) index.delete(name)

  // Reverse the base-class edges so each class can list what extends it.
  const subclasses = new Map<string, ClassRef[]>()
  for (const entry of modules) {
    const refs = byModule.get(entry.name) ?? []
    partition(entry.node).classes.forEach((cls, i) => {
      for (const base of (cls.bases ?? []).map(stringify).filter(Boolean)) {
        const parent = index.get(base.split('.').pop() ?? base)
        if (!parent) continue
        const list = subclasses.get(parent.qualname) ?? []
        list.push(refs[i])
        subclasses.set(parent.qualname, list)
      }
    })
  }

  const pages: RenderedPage[] = []
  for (const entry of modules) {
    const refs = byModule.get(entry.name) ?? []
    const page = renderModulePage(entry, sourceUrl, refs)
    if (page) pages.push(page)
    partition(entry.node).classes.forEach((cls, i) => {
      pages.push(
        renderClassPage(
          cls,
          refs[i].qualname,
          entry,
          sourceUrl,
          index,
          subclasses
        )
      )
    })
  }
  return pages
}
