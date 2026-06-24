// Bundle the package with esbuild so the extensionless / barrel ESM imports
// resolve into plain JS that Node runs directly. Dependencies (moxygen,
// handlebars, node built-ins) stay external. Runtime templates are copied next
// to the bundles, where the code reads them via `import.meta.dirname`.

import { build } from 'esbuild'
import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
}

rmSync(dist, { recursive: true, force: true })

await build({
  ...shared,
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(dist, 'index.js'),
})

// bin/index.ts already starts with a shebang, which esbuild preserves.
await build({
  ...shared,
  entryPoints: [join(root, 'bin/index.ts')],
  outfile: join(dist, 'bin.js'),
})

// The doxygen generator reads its moxygen templates at runtime relative to the
// bundle (import.meta.dirname === dist/), so copy them there.
cpSync(
  join(root, 'src/generators/doxygen/moxygen-templates'),
  join(dist, 'moxygen-templates'),
  { recursive: true }
)

console.log('Built dist/')
