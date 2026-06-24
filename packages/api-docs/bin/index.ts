#!/usr/bin/env node
// CLI for @rmf2-docs/api-docs.
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
//   npx @rmf2-docs/api-docs generate-api-docs [options]
//     --manifest <path>      path to the repos manifest (default: rmf2.repos.json)
//     -o, --out-dir <path>   directory to clone into     (default: .repos)

import { parseArgs } from 'node:util'
import { join, resolve } from 'node:path'
import { generateApiDocs } from '../src'

// The `generate-api-docs` command: clone every repo, then generate its docs.
const USAGE =
  'Usage: rmf2-docs generate-api-docs [--manifest <path>] [-o|--out-dir <path>] [--force-update]'

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      manifest: { type: 'string', default: 'rmf2.repos.json' },
      'out-dir': { type: 'string', short: 'o', default: '.repos' },
      // Re-fetch and hard-reset repos that are already cloned.
      'force-update': { type: 'boolean', default: false },
    },
  })

  const [command] = positionals
  if (command === 'generate-api-docs') {
    await generateApiDocs(
      resolve(values.manifest),
      resolve(values['out-dir']),
      values['force-update']
    )
    return
  }

  console.error(command ? `Unknown command: "${command}"\n${USAGE}` : USAGE)
  process.exitCode = 1
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`)
  process.exitCode = 1
})
