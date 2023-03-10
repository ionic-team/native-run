import { stringify } from './json'

export function log(message: string): void {
  if (process.argv.includes('--json'))
    message = stringify({ message })

  process.stdout.write(message)
}
