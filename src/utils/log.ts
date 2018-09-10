export function log(message: string): void {
  if (process.argv.includes('--json')) {
    message = JSON.stringify({ message });
  }

  process.stdout.write(message);
}
