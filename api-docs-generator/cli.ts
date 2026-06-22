#!/usr/bin/env node
// CLI for @rmf2-docs/api-docs-generator.
//
// Clones the repos listed in a JSON manifest, then hands each entry's `docs`
// targets to a pluggable generator — doxygen for C++ today, with Python/Rust to
// follow.
//
// The manifest is an array of objects:
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
// `type` is required; only "git" is supported. Each docs entry's `type` selects
// the generator; `outDir` is its markdown output (relative to cwd). Remaining
// docs fields are generator-specific.
//
// Run from the repo root (manifest paths resolve against cwd):
//   npx @rmf2-docs/api-docs-generator run [options]
//     --manifest <path>      path to the repos manifest (default: rmf2.repos.json)
//     -o, --out-dir <path>   directory to clone into     (default: .repos)

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { generateApiDocs } from './index.ts'
import type { DocsConfig } from './types.ts'
import { run } from './utils.ts'

interface RepoInfo {
  name: string
  url: string
  type: string
  version?: string
  docs?: DocsConfig[]
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

// Build a GitHub "blob" base URL so generators can turn a source location into
// a link to the exact file and line. Handles https and git@ remotes; falls back
// to HEAD when no version is pinned.
function sourceUrlBase(url: string, version?: string): string {
  const web = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '')
  return `${web}/blob/${version || 'HEAD'}`
}

async function downloadRepo(
  { name, url, type, version }: RepoInfo,
  outDir: string
): Promise<void> {
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

// The `run` command: clone every repo, then generate its docs.
async function runDocs(manifestPath: string, outDir: string): Promise<void> {
  const repos = readManifest(manifestPath)
  mkdirSync(outDir, { recursive: true })

  // Phase 1: download all repos simultaneously.
  console.log(`Downloading ${repos.length} repo(s) into ${outDir}`)
  const downloads = await Promise.allSettled(
    repos.map((repo) => downloadRepo(repo, outDir))
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

const USAGE =
  'Usage: api-docs-generator run [--manifest <path>] [-o|--out-dir <path>]'

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      manifest: { type: 'string', default: 'rmf2.repos.json' },
      'out-dir': { type: 'string', short: 'o', default: '.repos' },
    },
  })

  const [command] = positionals
  if (command === 'run') {
    await runDocs(resolve(values.manifest), resolve(values['out-dir']))
    return
  }

  console.error(command ? `Unknown command: "${command}"\n${USAGE}` : USAGE)
  process.exitCode = 1
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`)
  process.exitCode = 1
})
