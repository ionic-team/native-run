export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--list') || args.includes('-l')) {
    const list = await import('./list');
    process.stdout.write(await list.run(args));
    return;
  }

  const runCmd = await import('./run');
  return runCmd.run(args);
}
