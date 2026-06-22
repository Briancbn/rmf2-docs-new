import { spawn } from 'node:child_process'
import { once } from 'node:events'

// Spawn a command (inheriting stdio) and reject on a non-zero exit code.
export async function run(
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

// A generated page is "empty" when nothing remains after dropping its anchor
// tag, headings and blank lines — i.e. a bare title with no members, tables or
// description (e.g. a namespace that only contains sub-namespaces).
export function isContentEmpty(markdown: string): boolean {
  return markdown.split('\n').every((line) => {
    const text = line.trim()
    return !text || /^\{#[^}]*\}$/.test(text) || /^#{1,6}\s/.test(text)
  })
}
