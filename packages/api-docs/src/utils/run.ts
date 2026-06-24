import { spawn } from 'node:child_process'
import { once } from 'node:events'

// Spawn a command and reject on a non-zero exit code. With `quiet`, the command's
// stdout is discarded (stderr stays, so errors are still visible).
export async function run(
  command: string,
  args: string[],
  cwd: string = process.cwd(),
  quiet: boolean = false
): Promise<void> {
  const child = spawn(command, args, {
    cwd,
    stdio: ['inherit', quiet ? 'ignore' : 'inherit', 'inherit'],
  })
  const [code] = (await once(child, 'close')) as [number | null]
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${code}`)
  }
}
