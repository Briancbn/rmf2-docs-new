import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readManifest } from './read-manifest'
import { downloadRepo } from './download-repo'
import { runGenerator } from './run-generator'

// Build a GitHub "blob" base URL so generators can turn a source location into
// a link to the exact file and line. Handles https and git@ remotes; falls back
// to HEAD when no version is pinned.
function sourceUrlBase(url: string, version?: string): string {
  const web = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '')
  return `${web}/blob/${version || 'HEAD'}`
}

export async function generateApiDocs(
  manifestPath: string,
  outDir: string
): Promise<void> {
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

    for (const docsConfig of repo.docs) {
      try {
        await runGenerator(
          repo.name,
          join(outDir, repo.name),
          docsConfig,
          sourceUrlBase(repo.url, repo.version)
        )
      } catch (err) {
        failed += 1
        console.error(`✗ ${repo.name} docs: ${(err as Error).message}`)
      }
    }
  }

  if (failed > 0) {
    console.error(`\nDone with ${failed} failure(s).`)
    process.exitCode = 1
    return
  }

  console.log(`\n✓ All ${repos.length} repo(s) prepared.`)
}
