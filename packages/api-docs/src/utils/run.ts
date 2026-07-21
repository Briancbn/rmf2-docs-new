import { spawn } from 'node:child_process'
import { once } from 'node:events'

// Spawn a command and reject on a non-zero exit code. Returns the command's
// stdout, so callers can inspect it for tools that report failures in their
// output but still exit 0. With `quiet`, stdout is captured but not echoed
// (stderr stays, so errors are still visible).
export async function run(
  command: string,
  args: string[],
  cwd: string = process.cwd(),
  quiet: boolean = false
): Promise<string> {
  const child = spawn(command, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'inherit'],
  })

  let stdout = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk
    // Echo as it arrives, so long-running tools still stream their progress.
    if (!quiet) process.stdout.write(chunk)
  })

  const [code] = (await once(child, 'close')) as [number | null]
  if (code !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${code}`)
  }
  return stdout
}
