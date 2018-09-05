import * as Debug from 'debug';
import * as path from 'path';

import { Exception } from './errors';

const debug = Debug('native-run');

export async function run() {
  const args = process.argv.slice(2);

  if (args.includes('--version')) {
    const pkg = await import(path.resolve(__dirname, '../package.json'));
    process.stdout.write(pkg.version + '\n');
    return;
  }

  const [ platform, ...platformArgs ] = args;

  try {
    if (platform === 'android') {
      const lib = await import('./android');
      await lib.run(platformArgs);
    } else if (platform === 'ios') {
      const lib = await import('./ios');
      await lib.run(platformArgs);
    } else {
      if (!platform || platform === 'help' || args.includes('--help') || args.includes('-h') || platform.startsWith('-')) {
        const help = await import('./help');
        return help.run();
      }

      throw new Exception(`Unsupported platform: "${platform}"`);
    }
  } catch (e) {
    if (e instanceof Exception) {
      process.stderr.write(`${e.message}\n`);
      process.exitCode = e.exitCode;
    } else {
      debug('Caught fatal error: %O', e);
      process.stderr.write(String(e.stack ? e.stack : e));
      process.exitCode = 1;
    }
  }
}
