export async function run() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('help') || args.includes('-h')) {
    const help = await import('./help');
    return help.run();
  }

  const [platform] = args;
  if (platform !== 'android' && platform !== 'ios') {
    console.log(`Unsupported platform: ${platform}`);
  }

  if (process.argv.includes('--list')) {
    // TODO: list devices/emulators
    const list = await import('./list');
    return list.run();
  }
}
