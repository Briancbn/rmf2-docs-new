import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import type { RepoInfo } from '../types'

export function readManifest(path: string): RepoInfo[] {
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
