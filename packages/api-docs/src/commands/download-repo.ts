import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RepoInfo } from '../types'
import { run } from '../utils'

async function git(cwd: string, ...gitArgs: string[]): Promise<void> {
  await run('git', gitArgs, cwd)
}

export async function downloadRepo(
  { name, url, type, version }: RepoInfo,
  outDir: string,
  forceUpdate: boolean = false
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

  if (!existsSync(dest)) {
    console.log(`\n↓ Cloning ${label}`)
    await git(
      outDir,
      'clone',
      ...(version ? ['--branch', version] : []),
      url,
      name
    )
  } else if (forceUpdate) {
    console.log(`\n↻ Updating ${label} (force)`)
    await git(dest, 'fetch', 'origin', ...(version ? [version] : []))
    await git(dest, 'reset', '--hard', 'FETCH_HEAD')
  } else {
    console.log(`\n✓ ${label} already present`)
  }
}
