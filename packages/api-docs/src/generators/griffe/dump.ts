// The shape of `griffe dump` JSON, plus the one thing it does not give us as
// text: annotations, defaults and base classes arrive as expression trees, so
// they are flattened back into Python source here.
//
// Griffe reads the source statically — it never imports the package — so
// modules that fail to import, or whose annotations use syntax that runtime
// introspection chokes on (PEP 604 `X | Y`, string annotations), are still
// documented.

// A node in a griffe expression tree. Leaves are plain strings/numbers.
export type Expr =
  | string
  | number
  | boolean
  | null
  | { cls: string; [key: string]: unknown }
  | Expr[]

// A documented object in the dump. `kind` is module/class/function/attribute,
// or `alias` for a name imported from elsewhere.
export interface DumpNode {
  name: string
  kind: string
  filepath?: string
  lineno?: number
  labels?: string[]
  bases?: Expr[]
  decorators?: Expr[]
  parameters?: DumpParameter[]
  returns?: Expr
  annotation?: Expr
  value?: Expr
  docstring?: { value: string; lineno?: number }
  members?: Record<string, DumpNode>
}

export interface DumpParameter {
  name: string
  kind?: string
  annotation?: Expr
  default?: Expr
}

// Prefix for the `*args` / `**kwargs` parameter kinds.
const VARIADIC: Record<string, string> = {
  'variadic positional': '*',
  'variadic keyword': '**',
}

// Flatten an expression tree back into Python source, e.g. the tree for
// `Optional[list[State]]` or `str | None`. Unknown node types degrade to their
// concatenated children rather than throwing, so a griffe upgrade that adds a
// node type cannot break the build.
export function stringify(expr: Expr | undefined): string {
  if (expr === undefined || expr === null) return ''
  if (typeof expr !== 'object') return String(expr)
  if (Array.isArray(expr)) return expr.map(stringify).join('')

  const node = expr as { cls: string; [key: string]: unknown }
  const at = (key: string) => stringify(node[key] as Expr)
  const list = (key: string) =>
    ((node[key] ?? []) as Expr[]).map(stringify).join(', ')

  switch (node.cls) {
    case 'ExprName':
      return String(node.name ?? '')
    case 'ExprAttribute':
      return ((node.values ?? []) as Expr[]).map(stringify).join('.')
    case 'ExprSubscript':
      return `${at('left')}[${at('slice')}]`
    case 'ExprBinOp':
      return `${at('left')} ${String(node.operator ?? '')} ${at('right')}`
    case 'ExprBoolOp':
      return ((node.values ?? []) as Expr[])
        .map(stringify)
        .join(` ${String(node.operator ?? '')} `)
    case 'ExprUnaryOp':
      return `${String(node.operator ?? '')}${at('value')}`
    case 'ExprCall':
      return `${at('function')}(${list('arguments')})`
    case 'ExprKeyword':
      return `${String(node.name ?? '')}=${at('value')}`
    case 'ExprTuple':
      // An implicit tuple has no parentheses in the source, e.g. a subscript
      // slice like `Dict[str, int]`.
      return node.implicit ? list('elements') : `(${list('elements')})`
    case 'ExprList':
      return `[${list('elements')}]`
    case 'ExprDict': {
      const keys = (node.keys ?? []) as Expr[]
      const values = (node.values ?? []) as Expr[]
      return `{${keys.map((k, i) => `${stringify(k)}: ${stringify(values[i])}`).join(', ')}}`
    }
    case 'ExprLambda':
      return `lambda ${((node.parameters ?? []) as DumpParameter[])
        .map((p) => p.name)
        .join(', ')}: ${at('body')}`
    default:
      return Object.entries(node)
        .filter(([key]) => key !== 'cls')
        .map(([, value]) => stringify(value as Expr))
        .join('')
  }
}

// Collapse a summary-table parameter list to `(...)` once it grows past this,
// matching `MAX_TABLE_ARGS` on the C++ side. The full list is still one click
// away in the detail entry.
const MAX_TABLE_PARAMS = 40

// A callable's parameters as source text. `self`/`cls` are dropped — they are
// noise in rendered docs, and the leading-parameter check keeps a same-named
// argument on a plain function.
function parameters(node: DumpNode): string[] {
  const parts: string[] = []
  for (const param of node.parameters ?? []) {
    if ((param.name === 'self' || param.name === 'cls') && parts.length === 0)
      continue
    let piece = `${VARIADIC[param.kind ?? ''] ?? ''}${param.name}`
    const annotation = stringify(param.annotation)
    if (annotation) piece += `: ${annotation}`
    const fallback = stringify(param.default)
    if (fallback) piece += ` = ${fallback}`
    parts.push(piece)
  }
  return parts
}

// The signature for a detail entry. As on the C++ pages, more than one
// parameter breaks the list one-per-line, with the closing paren and return
// annotation trailing the last one.
export function signature(node: DumpNode): string {
  const params = parameters(node)
  const returns = stringify(node.returns)
  const tail = `)${returns ? ` → ${returns}` : ''}`

  if (params.length <= 1) return `${node.name}(${params.join('')}${tail}`
  return (
    [
      `${node.name}(`,
      ...params.map(
        (param, i) => `    ${param}${i < params.length - 1 ? ',' : ''}`
      ),
    ].join('\n') + tail
  )
}

// The signature for a summary-table cell: always one line, with a long
// parameter list collapsed to `(...)`.
export function tableSignature(node: DumpNode): string {
  const params = parameters(node).join(', ')
  const returns = stringify(node.returns)
  return `${node.name}(${params.length > MAX_TABLE_PARAMS ? '...' : params})${
    returns ? ` → ${returns}` : ''
  }`
}

// The badge kind for a class member, mirroring the C++ `static`/`explicit`
// modifiers. Decorators are checked alongside labels because griffe only labels
// some of these.
export function memberKind(node: DumpNode): string {
  const labels = new Set(node.labels ?? [])
  const decorators = new Set((node.decorators ?? []).map(stringify))
  if (labels.has('property') || decorators.has('property')) return 'property'
  if (node.name === '__init__') return 'constructor'
  if (labels.has('staticmethod') || decorators.has('staticmethod'))
    return 'static method'
  if (labels.has('classmethod') || decorators.has('classmethod'))
    return 'class method'
  if (labels.has('abstractmethod') || decorators.has('abstractmethod'))
    return 'abstract method'
  return 'method'
}
