export async function run() {
  const args = process.argv.slice(2);

  if (args.includes('--version')) {
    const pkg = require('../package.json');
    process.stdout.write(pkg.version);
    return;
  }

  const [ platform, ...platformArgs ] = args;

  if (platform === 'android') {
    const lib = await import('./android');
    await lib.run(platformArgs);
  } else if (platform === 'ios') {
    // TODO
  } else {
    if (!platform || platform === 'help' || args.includes('--help') || args.includes('-h')) {
      const help = await import('./help');
      return help.run();
    }

    process.stderr.write(`Unsupported platform: "${platform}"\n`);
    process.exitCode = 1;
  }
}
