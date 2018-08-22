export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--list') || args.includes('-l')) {
    const list = await import('./list');
    return list.run(args);
  }

  const runCmd = await import('./run');
  return runCmd.run(args);
}
