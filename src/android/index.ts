export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--list')) {
    const cmd = await import ('./list');
    return cmd.run(args);
  }

  if (args.includes('--sdk-info')) {
    const cmd = await import ('./sdk-info');
    return cmd.run(args);
  }

  const cmd = await import('./run');
  await cmd.run(args);
}
