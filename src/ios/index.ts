import { Command } from '../';

export async function run(args: ReadonlyArray<string>): Promise<void> {
  let cmd: Command;

  if (args.includes('--help') || args.includes('-h')) {
    cmd = await import('./help');
    return cmd.run(args);
  }

  if (args.includes('--list') || args.includes('-l')) {
    cmd = await import('./list');
    return cmd.run(args);
  }

  cmd = await import('./run');
  await cmd.run(args);
}
