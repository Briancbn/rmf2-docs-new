// Prepare API reference docs from multiple GitHub repos described in a JSON file.
//
// For each repo the script clones/updates the source, then runs doxygen +
// moxygen for every entry in its `docs` array to produce markdown references.
//
// The JSON file is an array of objects:
//   [{
//     "name": "...",
//     "url": "https://github.com/org/repo.git",
//     "type": "git",
//     "version": "main",
//     "docs": [
//       { "type": "doxygen", "xmlPath": "docs/api/xml", "outDir": "./docs/references/foo/cpp" }
//     ]
//   }]
//
// `type` is required; only "git" is supported — other types are skipped.
// Each docs entry: `type` ("doxygen" only), `xmlPath` (doxygen XML output,
// relative to the repo), `outDir` (markdown output dir, relative to cwd) and an
// optional `doxyfile` (Doxyfile path in the repo, default "Doxyfile").
//
// For each docs entry the script runs doxygen (to produce the XML) then feeds
// that XML to moxygen's `run()` API (classes mode) using the bundled custom C++
// templates, writing one markdown file per class into `outDir`.
//
// Each repo is cloned into <out-dir>/<name>. If `version` (branch/tag) is given
// the clone is checked out at it; otherwise the remote's default branch is used.
// If the target already exists, it is fetched and reset to the requested version.
//
// Usage: node scripts/prepare-repos-api-docs.ts [options]
//   --manifest <path>      path to the repos manifest (default: rmf2.repos.json)
//   -o, --out-dir <path>   directory to clone into     (default: .repos)

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import Handlebars from 'handlebars'
import { run as runMoxygen, defaultFilters } from 'moxygen'

// Doxygen records `<includes>` as just the basename (e.g. "base.hpp"), but the
// compound's `location` carries the full path. Expose a helper that strips up
// to the conventional `include/` root so templates can render the real include
// path (e.g. "vda5050_core/execution/base.hpp"). Handlebars resolves to the
// same singleton instance moxygen renders with, so this helper is available to
// the custom templates. Falls back to the location, then the basename.
Handlebars.registerHelper('incPath', (location, fallback) => {
  const path = String(location ?? '')
  const match = path.match(/(?:^|\/)include\/(.+)$/)
  return match ? match[1] : path || String(fallback ?? '')
})

// When a doxygen comment references a symbol inside inline-code (e.g. `Foo`),
// moxygen emits the link *inside* the backticks — `[Foo](url)` — and markdown
// then renders that as literal text instead of a link. The helpers below move
// the link back out of the code span so it stays clickable, the same way
// moxygen's own (internal) `inline()` helper does:
//
//   `[Foo](url)`        ->  [`Foo`](url)
//   `get<[Bar](url)>()` ->  `get<`[`Bar`](url)`>()`

// A markdown link, e.g. `[text](url)`.
const MARKDOWN_LINK = /\[([^\]]*)\]\(([^)]*)\)/
// An inline-code span whose contents include a markdown link.
const CODE_SPAN_WITH_LINK = /`([^`\n]*\]\([^`\n]*)`/g
// The start/end fence of a code block (```), which we must leave untouched.
const CODE_FENCE = /^\s*```/

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

// Repair every code-wrapped link in a block of markdown, skipping fenced code.
function fixCodeWrappedLinks(markdown: string): string {
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

// Expose it to the templates as {{fixLinks description}}. SafeString keeps the
// markdown from being HTML-escaped on the way out.
Handlebars.registerHelper(
  'fixLinks',
  (text) => new Handlebars.SafeString(fixCodeWrappedLinks(String(text ?? '')))
)

// moxygen's built-in `linkedName` shortens a qualified name with
// `name.split('::').pop()`. That breaks for template base classes whose
// arguments themselves contain `::`, e.g.
//   Initialize< OrderExecutionResource, execution::ResourceBase >
// would shorten to the garbage "ResourceBase >". This drop-in splits the
// template-argument suffix off first, shortens only the qualified part, then
// reattaches the arguments. It must use a new name (not `linkedName`) because
// moxygen re-registers its own helper on every run. `{#ref refid #}` is
// moxygen's placeholder, resolved to a real href later in its pipeline.
Handlebars.registerHelper('inheritedName', (name, refid) => {
  const fullName = String(name ?? '')
  const templateStart = fullName.indexOf('<')
  const qualified =
    templateStart === -1 ? fullName : fullName.slice(0, templateStart)
  const templateArgs = templateStart === -1 ? '' : fullName.slice(templateStart)
  const short = (qualified.split('::').pop() || qualified).trim() + templateArgs

  return refid ? `[\`${short}\`]({#ref ${refid} #})` : `\`${short}\``
})

// Render moxygen's built-in `badges` (bound to the current member) with some
// qualifiers removed. `inline` is always dropped (noise); the caller can hide
// more — e.g. `const` where the rendered signature already shows it.
function filterBadges(member: unknown, hidden: Set<string>): string {
  return String(Handlebars.helpers.badges.call(member))
    .split(' ')
    .filter((badge) => badge && !hidden.has(badge))
    .join(' ')
}

// For places that show only the name (no signature): keep `const` etc., drop `inline`.
Handlebars.registerHelper('badgesNoInline', function () {
  return filterBadges(this, new Set(['`inline`']))
})

// For places that already render the full signature: also drop `const`, which
// the signature itself carries, to avoid showing it twice.
Handlebars.registerHelper('signatureBadges', function () {
  return filterBadges(this, new Set(['`inline`', '`const`']))
})

// Strip markdown links down to their text (matches moxygen's stripMarkdownLinks,
// which isn't part of its public API).
function stripLinks(value: unknown): string {
  return String(value ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

// Render one declared parameter as "type name = default".
function formatParam(param: {
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
// members fall back to moxygen's single-line `signature` (minus `inline`).
const FUNCTION_KINDS = new Set(['function', 'signal', 'slot'])
Handlebars.registerHelper('signatureNoInline', function () {
  const member = this as Record<string, any>
  if (!FUNCTION_KINDS.has(member.kind)) {
    return String(Handlebars.helpers.signature.call(this)).replace(
      /\binline\s+/g,
      ''
    )
  }

  const lines: string[] = []
  const tparams = Array.isArray(member.templateParams)
    ? member.templateParams
    : []
  if (tparams.length)
    lines.push(`template<${tparams.map(formatParam).join(', ')}>`)

  // Leading specifiers + return type + name (inline intentionally omitted).
  const head: string[] = []
  if (Array.isArray(member.prefixQualifiers))
    head.push(...member.prefixQualifiers)
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
})

// Shorten an argument list for table display. Splits the parameter list from any
// trailing qualifiers (`const`, `=delete`, ...) and collapses long parameters to
// `(...)`, keeping the qualifiers. The full signature still shows in the detail.
const MAX_TABLE_ARGS = 40
Handlebars.registerHelper('tableArgs', (argsstring) => {
  const args = String(argsstring ?? '')
  const match = args.match(/^\((.*)\)(.*)$/)
  if (!match) return args

  const [, params, trailing] = match
  return `(${params.length > MAX_TABLE_ARGS ? '...' : params})${trailing}`
})

// moxygen orders class sections by first appearance in the source, so types can
// end up after methods. Move type sections to the front (stable, so the rest
// keep their original order) and expose as {{#each (orderedSections ...)}}.
const TYPE_SECTIONS = new Set(['public-type', 'protected-type', 'private-type'])
Handlebars.registerHelper('orderedSections', (sections) =>
  [...(sections ?? [])].sort(
    (a, b) =>
      Number(TYPE_SECTIONS.has(b.section)) -
      Number(TYPE_SECTIONS.has(a.section))
  )
)

// The per-member detail block, shared by every documentation category below.
// Registered as a partial so the categories can each render it via {{> memberDetail}}.
// Precompiled (noEscape, non-strict) so missing fields don't throw.
Handlebars.registerPartial(
  'memberDetail',
  Handlebars.compile(
    readFileSync(
      join(
        import.meta.dirname,
        'moxygen-templates',
        'partials',
        'member-detail.md'
      ),
      'utf8'
    ),
    { noEscape: true }
  )
)

// Split a class's members into the documentation categories doxygen uses. A
// constructor shares the class's short name; a destructor starts with `~`.
function shortClassName(fullName: unknown): string {
  return (String(fullName).split('<')[0].split('::').pop() || '').trim()
}
function isConstructorOrDestructor(member: any, className: unknown): boolean {
  const name = String(member.name ?? '')
  return name === shortClassName(className) || name.startsWith('~')
}
const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : [])

// Categorize members by kind — works for both classes and namespaces.
Handlebars.registerHelper('typedefMembers', (members) =>
  asArray(members).filter((m) => m.kind === 'typedef')
)
Handlebars.registerHelper('enumMembers', (members) =>
  asArray(members).filter((m) => m.kind === 'enum')
)
// Constructors and destructors.
Handlebars.registerHelper('constructorMembers', (members, className) =>
  asArray(members).filter(
    (m) => FUNCTION_KINDS.has(m.kind) && isConstructorOrDestructor(m, className)
  )
)
// Member functions other than constructors/destructors.
Handlebars.registerHelper('functionMembers', (members, className) =>
  asArray(members).filter(
    (m) =>
      FUNCTION_KINDS.has(m.kind) && !isConstructorOrDestructor(m, className)
  )
)
// Data members (member variables / attributes).
Handlebars.registerHelper('dataMembers', (members) =>
  asArray(members).filter((m) => m.kind === 'variable')
)

interface DocsConfig {
  type: string
  xmlPath: string
  outDir: string
  // Doxyfile to run, relative to the repo root (default: "Doxyfile").
  doxyfile?: string
}

interface RepoInfo {
  name: string
  url: string
  type: string
  version?: string
  docs?: DocsConfig[]
}

const { values } = parseArgs({
  options: {
    manifest: { type: 'string', default: 'rmf2.repos.json' },
    'out-dir': { type: 'string', short: 'o', default: '.repos' },
  },
})

const manifestPath = resolve(values.manifest)
const outDir = resolve(values['out-dir'])
// Custom moxygen C++ templates (bundled next to this script), resolved relative
// to the script so it works regardless of the current working directory.
const cppTemplatesDir = join(import.meta.dirname, 'moxygen-templates', 'cpp')
// Drop private members so no "Private ..." sections (attributes, methods, etc.)
// are emitted.
const memberFilters = {
  members: defaultFilters.members.filter((kind) => !kind.startsWith('private')),
  compounds: defaultFilters.compounds,
}

async function run(
  command: string,
  args: string[],
  cwd: string = process.cwd()
): Promise<void> {
  const child = spawn(command, args, { cwd, stdio: 'inherit' })
  const [code] = (await once(child, 'close')) as [number | null]
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${code}`)
  }
}

function git(cwd: string, ...gitArgs: string[]): Promise<void> {
  return run('git', gitArgs, cwd)
}

function readManifest(path: string): RepoInfo[] {
  if (!existsSync(path)) {
    throw new Error(`manifest not found: ${path}`)
  }

  let repos: unknown
  try {
    repos = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`failed to parse ${path}: ${(err as Error).message}`)
  }

  if (!Array.isArray(repos)) {
    throw new Error(`${path} must contain a JSON array of repos.`)
  }

  return repos as RepoInfo[]
}

// Build a GitHub "blob" base URL so moxygen can turn each source location into
// a link to the exact file and line (it appends `/<path>#L<line>`). Handles
// https and git@ remotes; falls back to HEAD when no version is pinned.
function sourceUrlBase(url: string, version?: string): string {
  const web = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '')
  return `${web}/blob/${version || 'HEAD'}`
}

// A generated page is "empty" when nothing remains after dropping its anchor
// tag, headings and blank lines — i.e. a bare title with no members, tables or
// description (e.g. a namespace that only contains sub-namespaces).
function isContentEmpty(markdown: string): boolean {
  return markdown.split('\n').every((line) => {
    const text = line.trim()
    return !text || /^\{#[^}]*\}$/.test(text) || /^#{1,6}\s/.test(text)
  })
}

async function generateApiDocs(
  name: string,
  repoDir: string,
  docs: DocsConfig[],
  sourceUrl: string
): Promise<void> {
  for (const doc of docs) {
    if (doc.type !== 'doxygen') {
      console.warn(`⚠ Skipping ${name} docs: unsupported type "${doc.type}"`)
      continue
    }

    const xmlDir = join(repoDir, doc.xmlPath)
    const markdownDir = resolve(doc.outDir)
    mkdirSync(markdownDir, { recursive: true })

    // Clear stale generated markdown, but leave any other files in place.
    for (const entry of readdirSync(markdownDir)) {
      if (entry.endsWith('.md')) {
        rmSync(join(markdownDir, entry))
      }
    }

    console.log(`\n⚙ doxygen: ${name}`)
    await run('doxygen', [doc.doxyfile ?? 'Doxyfile'], repoDir)

    console.log(`\n⚙ moxygen: ${name} -> ${markdownDir}`)
    await runMoxygen({
      directory: xmlDir,
      output: join(markdownDir, '%s.md'),
      classes: true,
      templates: cppTemplatesDir,
      sourceUrl,
      filters: memberFilters,
    })

    // Remove pages that ended up with no real content (title only).
    let removed = 0
    for (const entry of readdirSync(markdownDir)) {
      const file = join(markdownDir, entry)
      if (entry.endsWith('.md') && isContentEmpty(readFileSync(file, 'utf8'))) {
        rmSync(file)
        removed += 1
      }
    }
    if (removed) console.log(`  removed ${removed} empty page(s)`)
  }
}

async function downloadRepo({
  name,
  url,
  type,
  version,
}: RepoInfo): Promise<void> {
  if (!name || !url) {
    throw new Error(
      `each repo needs a "name" and "url" (got ${JSON.stringify({ name, url })})`
    )
  }

  if (type !== 'git') {
    console.warn(`⚠ Skipping ${name}: unsupported type "${type}"`)
    return
  }

  const dest = join(outDir, name)
  const label = version ? `${name} (${version})` : name

  if (existsSync(dest)) {
    // console.log(`\n↻ Updating ${label}`)
    // await git(dest, 'fetch', 'origin', ...(version ? [version] : []))
    // await git(dest, 'reset', '--hard', 'FETCH_HEAD')
  } else {
    console.log(`\n↓ Cloning ${label}`)
    await git(
      outDir,
      'clone',
      ...(version ? ['--branch', version] : []),
      url,
      name
    )
  }
}

async function main(): Promise<void> {
  const repos = readManifest(manifestPath)
  mkdirSync(outDir, { recursive: true })

  // Phase 1: download all repos simultaneously.
  console.log(`Downloading ${repos.length} repo(s) into ${outDir}`)
  const downloads = await Promise.allSettled(
    repos.map((repo) => downloadRepo(repo))
  )

  let failed = 0
  downloads.forEach((result, i) => {
    if (result.status === 'rejected') {
      failed += 1
      const name = repos[i]?.name || 'unknown'
      console.error(`✗ ${name}: ${(result.reason as Error).message}`)
    }
  })

  // Phase 2: generate API docs once every repo is in place. Run sequentially —
  // moxygen keeps module-level template/anchor state that concurrent runs race.
  for (let i = 0; i < repos.length; i += 1) {
    const repo = repos[i]
    if (downloads[i].status !== 'fulfilled') continue
    if (repo.type !== 'git' || !repo.docs?.length) continue

    try {
      await generateApiDocs(
        repo.name,
        join(outDir, repo.name),
        repo.docs,
        sourceUrlBase(repo.url, repo.version)
      )
    } catch (err) {
      failed += 1
      console.error(`✗ ${repo.name} docs: ${(err as Error).message}`)
    }
  }

  if (failed > 0) {
    console.error(`\nDone with ${failed} failure(s).`)
    process.exitCode = 1
    return
  }

  console.log(`\n✓ All ${repos.length} repo(s) prepared.`)
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`)
  process.exitCode = 1
})
