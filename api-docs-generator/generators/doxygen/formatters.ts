// Pure formatting helpers used by the doxygen template handlers: link repair,
// signature building, parameter/name formatting, include paths and section
// ordering. No Handlebars dependency — these are plain string transforms.

import type { Member } from 'moxygen'
import {
  FUNCTION_KINDS,
  TYPE_SECTIONS,
  MAX_TABLE_ARGS,
  MARKDOWN_LINK,
  CODE_SPAN_WITH_LINK,
  CODE_FENCE,
} from './constants.ts'

// Strip markdown links down to their text (matches moxygen's stripMarkdownLinks,
// which isn't part of its public API).
export function stripLinks(value: unknown): string {
  return String(value ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

// Doxygen records `<includes>` as just the basename (e.g. "base.hpp"), but the
// compound's `location` carries the full path. Strip up to the conventional
// `include/` root so templates can render the real include path (e.g.
// "vda5050_core/execution/base.hpp"). Falls back to the location, then the
// basename.
export function includePath(location: unknown, fallback: unknown): string {
  const path = String(location ?? '')
  const match = path.match(/(?:^|\/)include\/(.+)$/)
  return match ? match[1] : path || String(fallback ?? '')
}

// Rewrite the contents of a single inline-code span: keep plain-text fragments
// as inline-code, but pull any markdown links out so they remain links.
function rewriteCodeSpan(spanContents: string): string {
  const fragments = spanContents.split(/(\[[^\]]*\]\([^)]*\))/g).filter(Boolean)

  return fragments
    .map((fragment) => {
      const link = fragment.match(MARKDOWN_LINK)
      if (!link) return `\`${fragment}\`` // plain text -> inline-code

      const [, text, url] = link
      return `[\`${text}\`](${url})` // link -> linked inline-code, outside backticks
    })
    .join('')
}

// When a doxygen comment references a symbol inside inline-code (e.g. `Foo`),
// moxygen emits the link *inside* the backticks — `[Foo](url)` — and markdown
// then renders that as literal text instead of a link. Move the link back out
// of the code span so it stays clickable (skipping fenced code), the same way
// moxygen's own (internal) `inline()` helper does:
//
//   `[Foo](url)`        ->  [`Foo`](url)
//   `get<[Bar](url)>()` ->  `get<`[`Bar`](url)`>()`
export function fixDescriptionLinks(markdown: string): string {
  let insideCodeFence = false

  const lines = markdown.split('\n').map((line) => {
    if (CODE_FENCE.test(line)) {
      insideCodeFence = !insideCodeFence
      return line
    }
    if (insideCodeFence) return line

    return line.replace(CODE_SPAN_WITH_LINK, (_match, spanContents) =>
      rewriteCodeSpan(spanContents)
    )
  })

  return lines.join('\n')
}

// moxygen's built-in `linkedName` shortens a qualified name with
// `name.split('::').pop()`. That breaks for template base classes whose
// arguments themselves contain `::`, e.g.
//   Initialize< OrderExecutionResource, execution::ResourceBase >
// would shorten to the garbage "ResourceBase >". This drop-in splits the
// template-argument suffix off first, shortens only the qualified part, then
// reattaches the arguments. `{#ref refid #}` is moxygen's placeholder, resolved
// to a real href later in its pipeline.
export function linkName(name: unknown, refid: unknown): string {
  const fullName = String(name ?? '')
  const templateStart = fullName.indexOf('<')
  const qualified =
    templateStart === -1 ? fullName : fullName.slice(0, templateStart)
  const templateArgs = templateStart === -1 ? '' : fullName.slice(templateStart)
  const short = (qualified.split('::').pop() || qualified).trim() + templateArgs

  return refid ? `[\`${short}\`]({#ref ${refid} #})` : `\`${short}\``
}

// Render one declared parameter as "type name = default".
export function formatParam(param: {
  type?: unknown
  name?: unknown
  defaultValue?: unknown
}): string {
  const type = stripLinks(param.type).trim()
  const name = stripLinks(param.name).trim()
  const def = stripLinks(param.defaultValue).trim()
  return `${name ? `${type} ${name}` : type}${def ? ` = ${def}` : ''}`
}

// Build a function signature for the detail block, dropping `inline` and laying
// it out for readability: the template clause sits on its own line, and the
// parameters break one-per-line once there is more than one. Non-function
// members fall back to moxygen's single-line signature (via `fallback`).
export function formatSignature(
  member: Member,
  fallback: () => string
): string {
  if (!FUNCTION_KINDS.has(member.kind)) {
    return fallback().replace(/\binline\s+/g, '')
  }

  const lines: string[] = []
  const tparams = Array.isArray(member.templateParams)
    ? member.templateParams
    : []
  if (tparams.length) {
    lines.push(`template<${tparams.map(formatParam).join(', ')}>`)
  }

  // Leading specifiers + return type + name (inline intentionally omitted).
  const head: string[] = []
  if (Array.isArray(member.prefixQualifiers)) {
    head.push(...member.prefixQualifiers)
  }
  if (member.isVirtual) head.push('virtual')
  if (member.isStatic) head.push('static')
  if (member.isExplicit) head.push('explicit')
  if (member.returnType) head.push(stripLinks(member.returnType).trim())
  const decl = `${head.join(' ')}${head.length ? ' ' : ''}${member.name}`

  const params = Array.isArray(member.params) ? member.params : []
  const qualifiers = Array.isArray(member.qualifiers) ? member.qualifiers : []
  const tail = qualifiers.length ? ` ${qualifiers.join(' ')}` : ''

  if (params.length > 1) {
    lines.push(`${decl}(`)
    params.forEach((param, i) => {
      const comma = i < params.length - 1 ? ',' : ''
      lines.push(`    ${formatParam(param)}${comma}`)
    })
    lines[lines.length - 1] += `)${tail}`
  } else {
    lines.push(`${decl}(${params.map(formatParam).join('')})${tail}`)
  }

  return lines.join('\n')
}

// Shorten an argument list for table display. Splits the parameter list from any
// trailing qualifiers (`const`, `=delete`, ...) and collapses long parameters to
// `(...)`, keeping the qualifiers. The full signature still shows in the detail.
export function tableArgs(argsstring: unknown): string {
  const args = String(argsstring ?? '')
  const match = args.match(/^\((.*)\)(.*)$/)
  if (!match) return args

  const [, params, trailing] = match
  return `(${params.length > MAX_TABLE_ARGS ? '...' : params})${trailing}`
}

// moxygen orders class sections by first appearance in the source, so types can
// end up after methods. Move type sections to the front (stable, so the rest
// keep their original order).
export function orderSections(sections: any[]): any[] {
  return [...(sections ?? [])].sort(
    (a, b) =>
      Number(TYPE_SECTIONS.has(b.section)) -
      Number(TYPE_SECTIONS.has(a.section))
  )
}
