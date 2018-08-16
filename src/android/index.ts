export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  const [ command, ...commandArgs ] = args;

  if (command === 'list-avds') {
    const cmd = await import ('./list-avds');
    return cmd.run(commandArgs);
  }

  const cmd = await import('./run');
  await cmd.run(args);
}
