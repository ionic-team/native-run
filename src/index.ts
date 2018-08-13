import { RunOptions } from './definitions';

export async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  const options: RunOptions = {
    json: args.includes('--json'),
  };

  const [platform, device] = args;

  if (args.includes('--list')) {
    // TODO: list devices/emulators
    const list = await import('./list');
    return list.run(platform, options);
  }

  if (platform !== 'android' && platform !== 'ios') {
    process.stderr.write(`Unsupported platform: "${platform}"\n`);
    process.exitCode = 1;
    return;
  }

  if (!device) {
    process.stderr.write(`Missing device ID.\n`);
    process.exitCode = 1;
    return;
  }

  const platformlib = await import(`./${platform}`);
  return platformlib.run(device, options);
}
