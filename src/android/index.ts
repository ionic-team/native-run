export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--sdk-info')) {
    const cmd = await import ('./sdk-info');
    return cmd.run(args);
  }

  if (args.includes('--list-avds')) {
    const cmd = await import ('./list-avds');
    return cmd.run(args);
  }

  if (args.includes('--list-devices')) {
    const cmd = await import ('./list-devices');
    return cmd.run(args);
  }

  const cmd = await import('./run');
  await cmd.run(args);
}
