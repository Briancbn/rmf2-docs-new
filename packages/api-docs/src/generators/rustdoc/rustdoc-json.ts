// The shape of `rustdoc --output-format json`, plus the flattening of its type
// trees back into Rust source.
//
// The format is nightly-only and versioned: `format_version` changes with the
// toolchain, so the generator checks it and the unknown-variant handling below
// degrades instead of throwing.

// A type tree. Each node is a single-key object tagged by its variant.
export type RustType =
  | string
  | { [variant: string]: unknown }
  | RustType[]
  | null

export interface Span {
  filename: string
  begin?: [number, number]
  end?: [number, number]
}

export interface Item {
  id: number
  crate_id: number
  name: string | null
  span?: Span | null
  visibility?: unknown
  docs?: string | null
  attrs?: string[]
  deprecation?: unknown
  inner: Record<string, any>
}

// `paths` entry: the canonical path of any item, including ones from other
// crates (which is how a foreign type gets a readable name).
export interface PathEntry {
  crate_id: number
  path: string[]
  kind: string
}

export interface RustdocRoot {
  root: number
  crate_version: string | null
  includes_private: boolean
  index: Record<string, Item>
  paths: Record<string, PathEntry>
  format_version: number
}

// The `format_version` this renderer was written against. A newer toolchain
// usually only adds variants, so a mismatch warns rather than fails.
export const SUPPORTED_FORMAT_VERSION = 60

// The single key of a variant-tagged node.
const variantOf = (node: Record<string, unknown>): string =>
  Object.keys(node)[0] ?? ''

// `crate::foo::Bar` is how rustdoc spells a path into the crate being
// documented; the crate's real name reads better and matches the page titles.
export function normalizePath(path: string, crateName: string): string {
  return path.startsWith('crate::')
    ? `${crateName}${path.slice('crate'.length)}`
    : path
}

export interface TypeContext {
  crateName: string
}

// Flatten a type tree back into Rust source, e.g. `Result<(ExecutorHandle,
// Router), String>` or `&mut [u8]`. Unknown variants degrade to their rendered
// children rather than throwing, so a format bump cannot break the build.
export function stringify(
  type: RustType | undefined,
  ctx: TypeContext
): string {
  if (type === undefined || type === null) return ''
  if (typeof type === 'string') return type
  if (Array.isArray(type)) return type.map((t) => stringify(t, ctx)).join(', ')

  const node = type as Record<string, any>
  const variant = variantOf(node)
  const value = node[variant]

  switch (variant) {
    case 'resolved_path': {
      const args = genericArgs(value.args, ctx)
      return `${normalizePath(String(value.path ?? ''), ctx.crateName)}${args}`
    }
    case 'generic':
      return String(value)
    case 'primitive':
      return String(value)
    case 'borrowed_ref': {
      const lifetime = value.lifetime ? `${value.lifetime} ` : ''
      const mutable = value.is_mutable ? 'mut ' : ''
      return `&${lifetime}${mutable}${stringify(value.type, ctx)}`
    }
    case 'raw_pointer':
      return `*${value.is_mutable ? 'mut' : 'const'} ${stringify(value.type, ctx)}`
    case 'tuple':
      return `(${(value as RustType[]).map((t) => stringify(t, ctx)).join(', ')})`
    case 'slice':
      return `[${stringify(value, ctx)}]`
    case 'array':
      return `[${stringify(value.type, ctx)}; ${value.len}]`
    case 'impl_trait':
      return `impl ${genericBounds(value, ctx)}`
    case 'dyn_trait': {
      const traits = (value.traits ?? [])
        .map((t: any) => stringify(t.trait, ctx))
        .join(' + ')
      const lifetime = value.lifetime ? ` + ${value.lifetime}` : ''
      return `dyn ${traits}${lifetime}`
    }
    case 'qualified_path': {
      const self = stringify(value.self_type, ctx)
      const trait = value.trait ? stringify(value.trait, ctx) : ''
      return trait
        ? `<${self} as ${trait}>::${value.name}`
        : `${self}::${value.name}`
    }
    case 'function_pointer': {
      const sig = value.sig ?? {}
      const inputs = (sig.inputs ?? [])
        .map(([, t]: [string, RustType]) => stringify(t, ctx))
        .join(', ')
      const output = sig.output ? ` -> ${stringify(sig.output, ctx)}` : ''
      return `fn(${inputs})${output}`
    }
    case 'infer':
      return '_'
    default:
      return typeof value === 'object' && value !== null
        ? stringify(value as RustType, ctx)
        : String(value ?? '')
  }
}

// `<T, 'a, K = V>` for a resolved path, or '' when there are none.
function genericArgs(args: any, ctx: TypeContext): string {
  if (!args) return ''
  if (args.angle_bracketed) {
    const parts = (args.angle_bracketed.args ?? []).map((arg: any) => {
      if (arg.type !== undefined) return stringify(arg.type, ctx)
      if (arg.lifetime !== undefined) return String(arg.lifetime)
      if (arg.const !== undefined) return String(arg.const?.expr ?? '')
      return ''
    })
    const constraints = (args.angle_bracketed.constraints ?? []).map(
      (c: any) => `${c.name} = ${stringify(c.binding?.equality?.type, ctx)}`
    )
    const all = [...parts, ...constraints].filter(Boolean)
    return all.length ? `<${all.join(', ')}>` : ''
  }
  if (args.parenthesized) {
    const inputs = (args.parenthesized.inputs ?? [])
      .map((t: RustType) => stringify(t, ctx))
      .join(', ')
    const output = args.parenthesized.output
      ? ` -> ${stringify(args.parenthesized.output, ctx)}`
      : ''
    return `(${inputs})${output}`
  }
  return ''
}

function genericBounds(bounds: any, ctx: TypeContext): string {
  return (bounds ?? [])
    .map((bound: any) =>
      bound.trait_bound
        ? stringify(bound.trait_bound.trait, ctx)
        : String(bound.outlives ?? '')
    )
    .filter(Boolean)
    .join(' + ')
}

// `<T: Bound, 'a>` for an item's own generic parameters.
export function generics(generics: any, ctx: TypeContext): string {
  const params = (generics?.params ?? [])
    .map((param: any) => {
      const kind = param.kind ?? {}
      if (kind.lifetime !== undefined) return String(param.name)
      if (kind.const !== undefined)
        return `const ${param.name}: ${stringify(kind.const.type, ctx)}`
      const bounds = genericBounds(kind.type?.bounds, ctx)
      return bounds ? `${param.name}: ${bounds}` : String(param.name)
    })
    .filter(Boolean)
  return params.length ? `<${params.join(', ')}>` : ''
}

// Collapse a summary-table parameter list to `(...)` once it grows past this,
// matching `MAX_TABLE_ARGS` on the C++ side.
const MAX_TABLE_PARAMS = 40

// `const`/`async`/`unsafe`/`extern` prefix for a function.
function fnPrefix(header: any): string {
  const parts: string[] = []
  if (header?.is_const) parts.push('const')
  if (header?.is_async) parts.push('async')
  if (header?.is_unsafe) parts.push('unsafe')
  const abi = header?.abi
  if (abi && abi !== 'Rust')
    parts.push(`extern "${typeof abi === 'string' ? abi : variantOf(abi)}"`)
  return parts.length ? `${parts.join(' ')} ` : ''
}

// A function's parameters as source text. `self` keeps its reference form
// (`&self`, `&mut self`) the way rustdoc renders it.
function parameters(item: Item, ctx: TypeContext): string[] {
  const inputs = (item.inner.function?.sig?.inputs ?? []) as [
    string,
    RustType,
  ][]
  return inputs.map(([name, type]) => {
    if (name === 'self') {
      const rendered = stringify(type, ctx)
      // `&Self`/`&mut Self` read as `&self`/`&mut self` in a signature.
      if (/^&(\s*'\w+)?\s*(mut\s+)?Self$/.test(rendered))
        return rendered.replace(/Self$/, 'self')
      if (rendered === 'Self') return 'self'
      return `self: ${rendered}`
    }
    return `${name}: ${stringify(type, ctx)}`
  })
}

// The signature for a detail entry. As on the C++ pages, more than one
// parameter breaks the list one-per-line, with the closing paren and return
// type trailing the last one.
export function signature(item: Item, ctx: TypeContext): string {
  const fn = item.inner.function
  const params = parameters(item, ctx)
  const output = stringify(fn?.sig?.output, ctx)
  const decl = `${fnPrefix(fn?.header)}fn ${item.name}${generics(fn?.generics, ctx)}`
  const tail = `)${output ? ` -> ${output}` : ''}`

  if (params.length <= 1) return `${decl}(${params.join('')}${tail}`
  return (
    [
      `${decl}(`,
      ...params.map(
        (param, i) => `    ${param}${i < params.length - 1 ? ',' : ''}`
      ),
    ].join('\n') + tail
  )
}

// The signature for a summary-table cell: always one line, with a long
// parameter list collapsed to `(...)`.
export function tableSignature(item: Item, ctx: TypeContext): string {
  const fn = item.inner.function
  const params = parameters(item, ctx).join(', ')
  const output = stringify(fn?.sig?.output, ctx)
  return `${fnPrefix(fn?.header)}fn ${item.name}${generics(fn?.generics, ctx)}(${
    params.length > MAX_TABLE_PARAMS ? '...' : params
  })${output ? ` -> ${output}` : ''}`
}
