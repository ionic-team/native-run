export async function run(args: string[]) {
  if (args.includes('--help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  if (args.includes('--list')) {
    const list = await import ('./list');
    process.stdout.write(await list.run(args));
    return;
  }

  let cmd: any;
  if (args.includes('--sdk-info')) {
    cmd = await import ('./sdk-info');
    return cmd.run(args);
  }

  cmd = await import('./run');
  await cmd.run(args);
}
