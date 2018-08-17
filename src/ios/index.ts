export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--list') || args.includes('-l')) {
    const cmd = await import('./list');
    await cmd.run(args);
  }
}
