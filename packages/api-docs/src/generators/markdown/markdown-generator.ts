import { dirname, join, posix, relative, sep } from 'node:path'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import type { ApiDocsGenerator, GenerateContext } from '../../types'

// markdown-specific fields on a docs entry.
interface MarkdownConfig {
  // Home page for the module, at the repo root; copied to `<outDir>/index.md`
  // (default "README.md").
  homePage?: string
  // Folder of additional prose pages, copied (recursively) into `<outDir>`.
  docsDir?: string
  // Sidebar title for the home page. Written to the home page's frontmatter so
  // the sidebar can pick it up; defaults to "Introduction". A home page's own
  // `title` frontmatter, if present, wins.
  homePageTitle?: string
}

// Ensure the home page carries a `title` in its frontmatter so the sidebar can
// label it. An existing `title` (a home page that already has frontmatter) wins.
function withHomePageTitle(content: string, title: string): string {
  const line = `title: ${JSON.stringify(title)}`
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    if (/^title:/m.test(fmMatch[1])) return content
    return content.replace(/^---\n/, `---\n${line}\n`)
  }
  return `---\n${line}\n---\n\n${content}`
}

// Tags kept as HTML when sanitizing; anything else that looks like a tag (e.g. a
// `<T>` type parameter written in prose) is escaped so VitePress/Vue does not
// fail the build with "missing end tag". Mirrors the rustdoc generator.
const HTML_TAGS = new Set([
  'a',
  'b',
  'br',
  'code',
  'details',
  'em',
  'i',
  'img',
  'kbd',
  'pre',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
])
const CODE_FENCE = /^\s*```/

function sanitizeForVitepress(markdown: string): string {
  let insideCodeFence = false
  return markdown
    .split('\n')
    .map((line) => {
      if (CODE_FENCE.test(line)) {
        insideCodeFence = !insideCodeFence
        return line
      }
      if (insideCodeFence) return line
      return line.replace(/<(\/?)([A-Za-z][\w-]*)/g, (match, slash, tag) =>
        HTML_TAGS.has(tag.toLowerCase()) ? match : `&lt;${slash}${tag}`
      )
    })
    .join('\n')
}

// A markdown link/image target left alone: absolute URLs, site-absolute paths,
// pure anchors and mailto.
const EXTERNAL_TARGET = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i

// Rewrite every relative link/image in `content` so it still resolves once the
// file has moved into the VitePress site. `fromRepoDir` is the source file's
// directory relative to the repo root ("" for the README); `outFromRoot` is the
// output file's path relative to `outDir`.
//
// - a target inside `docsDir` → a relative link to its copied page
// - a link to the home page → the home page (`index.md`)
// - anything else (source files, assets outside `docsDir`) → an absolute GitHub
//   URL, so the link still works even though the file was not copied
function rewriteLinks(
  content: string,
  fromRepoDir: string,
  outFromRoot: string,
  homePage: string,
  docsDir: string,
  sourceUrl: string
): string {
  const outDir = posix.dirname(outFromRoot)

  const remap = (raw: string): string => {
    const target = raw.trim()
    if (!target || EXTERNAL_TARGET.test(target)) return raw

    const hashAt = target.search(/[#?]/)
    const pathPart = hashAt === -1 ? target : target.slice(0, hashAt)
    const suffix = hashAt === -1 ? '' : target.slice(hashAt)
    if (!pathPart) return raw

    // Path of the referenced file, relative to the repo root.
    const repoRel = posix.normalize(posix.join(fromRepoDir, pathPart))

    let outTarget: string | null = null
    if (repoRel === homePage) {
      outTarget = 'index.md'
    } else if (repoRel === docsDir || repoRel.startsWith(`${docsDir}/`)) {
      outTarget = repoRel.slice(docsDir.length).replace(/^\//, '')
    }

    if (outTarget === null) {
      // Not copied into the site — link out to the source on GitHub.
      return `${sourceUrl}/${repoRel}${suffix}`
    }

    const rel = posix.relative(outDir, outTarget) || outTarget
    return `${rel.startsWith('.') ? rel : `./${rel}`}${suffix}`
  }

  // Inline links/images: `[text](target)` and `![alt](target)`, ignoring the
  // optional `"title"`. Also handles reference definitions (`[id]: target`) and
  // raw HTML attributes (`<img src="...">`), which READMEs use for sizing.
  return content
    .replace(
      /(!?\[[^\]]*\]\()([^)\s]+)(\s+"[^"]*")?(\))/g,
      (_m, open, target, title = '', close) =>
        `${open}${remap(target)}${title}${close}`
    )
    .replace(
      /^(\s*\[[^\]]+\]:\s+)(\S+)/gm,
      (_m, open, target) => `${open}${remap(target)}`
    )
    .replace(
      /\b(src|href)=("|')([^"']+)\2/g,
      (_m, attr, quote, target) => `${attr}=${quote}${remap(target)}${quote}`
    )
}

// Recursively list files under `dir`, returned as paths relative to `dir`.
function walk(dir: string, base: string = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full, base)
    return [relative(base, full)]
  })
}

// Prose (home page + docs/) generator: copies a module repo's hand-written
// markdown into the site instead of running a language tool. The repo's root
// home page (README by default) becomes the module's `index.md`; every page
// under `docsDir` is copied alongside it, and relative links are rewritten to
// resolve in their new home.
export const markdownGenerator: ApiDocsGenerator = {
  type: 'markdown',

  async generate({
    name,
    repoDir,
    outDir,
    sourceUrl,
    config,
  }: GenerateContext): Promise<void> {
    const doc = config as unknown as MarkdownConfig
    const homePage = (doc.homePage ?? 'README.md').replace(/^\.?\//, '')
    const docsDir = (doc.docsDir ?? 'docs').replace(/^\.?\/|\/$/g, '')
    const homePageTitle = doc.homePageTitle ?? 'Introduction'

    mkdirSync(outDir, { recursive: true })
    // The whole output directory is generated, so clear it (keep dotfiles such
    // as a committed .gitignore).
    for (const entry of readdirSync(outDir)) {
      if (!entry.startsWith('.'))
        rmSync(join(outDir, entry), { recursive: true })
    }

    console.log(`\n⚙ markdown: ${name} -> ${outDir}`)

    let written = 0
    const writePage = (
      body: string,
      fromRepoDir: string,
      outFromRoot: string
    ): void => {
      const rewritten = rewriteLinks(
        body,
        fromRepoDir,
        outFromRoot,
        homePage,
        docsDir,
        sourceUrl
      )
      const dest = join(outDir, outFromRoot)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, sanitizeForVitepress(rewritten))
      written += 1
    }

    // 1. Home page, from the repo root (README by default).
    const homePagePath = join(repoDir, homePage)
    if (!existsSync(homePagePath)) {
      throw new Error(`markdown: ${name} has no ${homePage} at the repo root`)
    }
    writePage(
      withHomePageTitle(readFileSync(homePagePath, 'utf8'), homePageTitle),
      '',
      'index.md'
    )

    // 2. The rest, from the repo's docs folder (if any).
    const docsPath = join(repoDir, docsDir)
    if (existsSync(docsPath)) {
      for (const rel of walk(docsPath)) {
        const posixRel = rel.split(sep).join('/')
        const src = join(docsPath, rel)
        if (rel.toLowerCase().endsWith('.md')) {
          // Skip a docs-folder README that would collide with the home page.
          if (posixRel.toLowerCase() === 'readme.md') continue
          writePage(readFileSync(src, 'utf8'), docsDir, posixRel)
        } else {
          // Assets (images, etc.) — copy verbatim so page references resolve.
          const dest = join(outDir, posixRel)
          mkdirSync(dirname(dest), { recursive: true })
          cpSync(src, dest)
        }
      }
    }

    console.log(`  wrote ${written} page(s)`)
  },
}
