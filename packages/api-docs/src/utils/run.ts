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
