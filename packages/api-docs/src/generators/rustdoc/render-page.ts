// Render a rustdoc JSON crate into markdown organised like the C++ (moxygen)
// pages: one page per type (struct/enum/trait), plus one page per module
// playing the role a namespace page plays in C++.
//
// A module page carries the module's free functions, constants and type
// aliases and links out to its types; a type page carries that type's fields or
// variants, its inherent methods and the traits it implements. Pages are named
// after the fully-qualified path, so the sidebar nests types under their module.

import { generics, signature, stringify, tableSignature } from './rustdoc-json'
import type { Item, RustdocRoot, TypeContext } from './rustdoc-json'

export interface RenderedPage {
  // Page basename without the extension. `::` is not filesystem-friendly, so
  // path separators become `-`, exactly as moxygen names the C++ pages.
  name: string
  kind: 'module' | 'type'
  content: string
}

// Item kinds that get a page of their own, mirroring C++ class pages.
const PAGE_KINDS = new Set(['struct', 'enum', 'trait', 'union'])
// Item kinds that stay on their module's page.
const INLINE_KINDS = new Set(['function', 'constant', 'type_alias', 'static'])

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// A qualified path as a page basename.
const pageName = (path: string): string => path.replace(/::/g, '-')

// Escape a value for use in a markdown table cell (pipes break the table; code
// spans must escape their pipes too).
const cell = (text: string): string =>
  text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()

const codeCell = (text: string): string => cell(`\`${text}\``)

// First paragraph of a doc comment, flattened — used for summary-table cells.
const brief = (docs: string | null | undefined): string =>
  ((docs ?? '').split(/\n\s*\n/)[0] ?? '').replace(/\s+/g, ' ').trim()

// Everything after the first paragraph.
const rest = (docs: string | null | undefined): string =>
  (docs ?? '')
    .split(/\n\s*\n/)
    .slice(1)
    .join('\n\n')
    .trim()

export interface RenderContext extends TypeContext {
  crate: RustdocRoot
  sourceUrl: string
  // Prefix inside the repo where the crate lives, since rustdoc spans are
  // relative to the crate root rather than the repo root.
  pathPrefix: string
  // Qualified path of every item that has a page, for cross-linking.
  pages: Map<number, string>
}

function item(ctx: RenderContext, id: number): Item | undefined {
  return ctx.crate.index[String(id)]
}

const kindOf = (it: Item): string => Object.keys(it.inner)[0] ?? ''

function definedIn(ctx: RenderContext, it: Item): string {
  const span = it.span
  if (!span?.filename) return ''
  const path = `${ctx.pathPrefix}${span.filename}`
  const line = span.begin?.[0]
  const label = line ? `${path}:${line}` : path
  return `Defined in [${label}](${ctx.sourceUrl}/${path}${line ? `#L${line}` : ''})`
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

// A `### name` detail entry, prefixed by a `---` rule and `{#anchor}` like the
// C++ member-detail partial.
function renderEntry(
  ctx: RenderContext,
  it: Item,
  code: string,
  badge?: string
): string[] {
  const out = ['---', '', `{#${slug(it.name ?? '')}}`, '', `### ${it.name}`, '']
  if (badge) out.push(`\`${badge}\``, '')
  out.push('```rust', code, '```', '')
  const defined = definedIn(ctx, it)
  if (defined) out.push(defined, '')
  if (it.docs) out.push(it.docs.trim(), '')
  return out
}

// Fields of a struct, or variants of an enum, as a table.
function memberTable(
  ctx: RenderContext,
  title: string,
  members: Item[],
  typed: boolean
): string[] {
  const rows = members.map((member) => {
    const type = typed ? stringify(member.inner.struct_field, ctx) : ''
    const cells = [codeCell(member.name ?? '')]
    if (typed) cells.push(type ? codeCell(type) : '')
    cells.push(cell(brief(member.docs)))
    return `| ${cells.join(' | ')} |`
  })
  return [
    `## ${title}`,
    '',
    typed ? '| Name | Type | Description |' : '| Name | Description |',
    typed ? '|------|------|-------------|' : '|------|-------------|',
    ...rows,
    '',
  ]
}

// The impls attached to a type, split into the inherent ones (whose methods are
// the type's own API) and the trait impls worth listing. Blanket and synthetic
// impls are dropped: they are the auto-derived `Send`/`Sync`/`From` noise that
// rustdoc attaches to every type, not something the author wrote.
function impls(ctx: RenderContext, it: Item) {
  const inherent: Item[] = []
  const traits: string[] = []

  for (const id of it.inner[kindOf(it)]?.impls ?? []) {
    const impl = item(ctx, id)
    const inner = impl?.inner?.impl
    if (!impl || !inner) continue
    if (inner.is_synthetic || inner.blanket_impl) continue

    if (!inner.trait) {
      for (const memberId of inner.items ?? []) {
        const member = item(ctx, memberId)
        if (member && kindOf(member) === 'function') inherent.push(member)
      }
    } else {
      traits.push(stringify(inner.trait, ctx))
    }
  }
  return { inherent, traits: [...new Set(traits)].sort() }
}

// The declaration line shown in the code block, e.g. `pub struct Settings`.
function declaration(ctx: RenderContext, it: Item): string {
  const kind = kindOf(it)
  const inner = it.inner[kind] ?? {}
  const params = generics(inner.generics, ctx)
  if (kind === 'trait') {
    const unsafety = inner.is_unsafe ? 'unsafe ' : ''
    return `pub ${unsafety}trait ${it.name}${params}`
  }
  return `pub ${kind} ${it.name}${params}`
}

// Render one struct/enum/trait onto its own page.
function renderTypePage(
  ctx: RenderContext,
  it: Item,
  path: string
): RenderedPage {
  const kind = kindOf(it)
  const inner = it.inner[kind] ?? {}
  const out: string[] = [
    `{#${slug(it.name ?? '')}}`,
    '',
    `# ${path}`,
    '',
    '```rust',
    declaration(ctx, it),
    '```',
    '',
  ]
  const defined = definedIn(ctx, it)
  if (defined) out.push(defined, '')

  const { inherent, traits } = impls(ctx, it)
  if (traits.length) {
    out.push(
      `> **Implements:** ${traits.map((t) => `\`${t}\``).join(', ')}`,
      ''
    )
  }

  const summary = brief(it.docs)
  if (summary) out.push(summary, '')

  // Fields (struct) or variants (enum).
  if (kind === 'struct') {
    const fieldIds = inner.kind?.plain?.fields ?? []
    const fields = fieldIds
      .map((id: number) => item(ctx, id))
      .filter(Boolean) as Item[]
    if (fields.length) out.push(...memberTable(ctx, 'Fields', fields, true))
  } else if (kind === 'enum') {
    const variants = (inner.variants ?? [])
      .map((id: number) => item(ctx, id))
      .filter(Boolean) as Item[]
    if (variants.length)
      out.push(...memberTable(ctx, 'Variants', variants, false))
  }

  // A trait's own methods live directly in its items, not in an impl.
  const traitMethods =
    kind === 'trait'
      ? ((inner.items ?? [])
          .map((id: number) => item(ctx, id))
          .filter(
            (m: Item | undefined) => m && kindOf(m) === 'function'
          ) as Item[])
      : []
  const methods = [...inherent, ...traitMethods]

  if (methods.length) {
    out.push(
      ...summaryTable(
        'Methods',
        methods.map(
          (method) =>
            `| [${codeCell(tableSignature(method, ctx))}](#${slug(method.name ?? '')}) | ${cell(brief(method.docs))} |`
        )
      )
    )
  }

  const detail = rest(it.docs)
  if (detail) out.push('## Detailed Description', '', detail, '')

  if (methods.length) {
    out.push('## Method Documentation', '')
    for (const method of methods) {
      out.push(...renderEntry(ctx, method, signature(method, ctx)))
    }
  }

  return { name: pageName(path), kind: 'type', content: finish(out) }
}

// Render a module page: the Rust analogue of a C++ namespace page.
function renderModulePage(
  ctx: RenderContext,
  it: Item,
  path: string,
  children: Array<{ item: Item; path: string }>
): RenderedPage | null {
  const types = children.filter((child) => PAGE_KINDS.has(kindOf(child.item)))
  const inline = children
    .filter((child) => INLINE_KINDS.has(kindOf(child.item)))
    .map((child) => child.item)
  const functions = inline.filter((child) => kindOf(child) === 'function')
  const others = inline.filter((child) => kindOf(child) !== 'function')

  if (!it.docs && !types.length && !inline.length) return null

  const out: string[] = [`{#${slug(path)}}`, '', `# ${path}`, '']
  const defined = definedIn(ctx, it)
  if (defined) out.push(defined, '')

  const summary = brief(it.docs)
  if (summary) out.push(summary, '')

  // One table per type kind, matching how the C++ namespace pages group by
  // member category.
  for (const [kind, title] of [
    ['struct', 'Structs'],
    ['enum', 'Enums'],
    ['trait', 'Traits'],
    ['union', 'Unions'],
  ] as const) {
    const group = types.filter((child) => kindOf(child.item) === kind)
    if (!group.length) continue
    out.push(
      ...summaryTable(
        title,
        group.map(
          (child) =>
            `| [${codeCell(child.item.name ?? '')}](${pageName(child.path)}.md#${slug(child.item.name ?? '')}) | ${cell(brief(child.item.docs))} |`
        )
      )
    )
  }

  if (functions.length) {
    out.push(
      ...summaryTable(
        'Functions',
        functions.map(
          (fn) =>
            `| [${codeCell(tableSignature(fn, ctx))}](#${slug(fn.name ?? '')}) | ${cell(brief(fn.docs))} |`
        )
      )
    )
  }

  if (others.length) {
    out.push(
      ...summaryTable(
        'Constants & Type Aliases',
        others.map(
          (other) =>
            `| [${codeCell(other.name ?? '')}](#${slug(other.name ?? '')}) | ${cell(brief(other.docs))} |`
        )
      )
    )
  }

  const detail = rest(it.docs)
  if (detail) out.push('## Detailed Description', '', detail, '')

  if (functions.length) {
    out.push('## Function Documentation', '')
    for (const fn of functions)
      out.push(...renderEntry(ctx, fn, signature(fn, ctx)))
  }

  for (const other of others) {
    if (!others.length) break
    const kind = kindOf(other)
    const code =
      kind === 'type_alias'
        ? `pub type ${other.name} = ${stringify(other.inner.type_alias?.type, ctx)}`
        : `pub const ${other.name}: ${stringify(other.inner.constant?.type, ctx)}`
    out.push(...renderEntry(ctx, other, code))
  }

  return { name: pageName(path), kind: 'module', content: finish(out) }
}

const finish = (lines: string[]): string =>
  lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'

// One module and the items its page is responsible for.
interface ModuleEntry {
  item: Item
  path: string
  children: Array<{ item: Item; path: string }>
}

// Walk the module tree from the crate root, collecting each module with the
// items declared directly in it. Only items reachable through public modules
// are documented; anything in a private module stays out of the docs.
function collectModules(
  ctx: RenderContext,
  id: number,
  path: string,
  out: ModuleEntry[]
): void {
  const module = item(ctx, id)
  if (!module || kindOf(module) !== 'module') return

  const children: Array<{ item: Item; path: string }> = []
  const submodules: Array<[number, string]> = []

  for (const childId of module.inner.module?.items ?? []) {
    const child = item(ctx, childId)
    if (!child?.name) continue
    const kind = kindOf(child)
    const childPath = `${path}::${child.name}`

    if (kind === 'module') {
      submodules.push([childId, childPath])
    } else if (PAGE_KINDS.has(kind) || INLINE_KINDS.has(kind)) {
      children.push({ item: child, path: childPath })
    }
  }

  out.push({ item: module, path, children })
  for (const [subId, subPath] of submodules)
    collectModules(ctx, subId, subPath, out)
}

// Render every module and type in the crate. Cross-page links need the full set
// up front, so this indexes the pages before rendering anything.
export function renderPages(
  crate: RustdocRoot,
  options: { crateName: string; sourceUrl: string; pathPrefix: string }
): RenderedPage[] {
  const ctx: RenderContext = {
    crate,
    crateName: options.crateName,
    sourceUrl: options.sourceUrl,
    pathPrefix: options.pathPrefix,
    pages: new Map(),
  }

  const modules: ModuleEntry[] = []
  collectModules(ctx, crate.root, options.crateName, modules)

  for (const module of modules) {
    for (const child of module.children) {
      if (PAGE_KINDS.has(kindOf(child.item)))
        ctx.pages.set(child.item.id, child.path)
    }
  }

  const pages: RenderedPage[] = []
  for (const module of modules) {
    const page = renderModulePage(
      ctx,
      module.item,
      module.path,
      module.children
    )
    if (page) pages.push(page)
    for (const child of module.children) {
      if (PAGE_KINDS.has(kindOf(child.item)))
        pages.push(renderTypePage(ctx, child.item, child.path))
    }
  }
  return pages
}
