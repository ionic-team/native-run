import * as Debug from 'debug';
import * as path from 'path';

import { CLIException, ERR_BAD_INPUT, Exception } from './errors';

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
    } else if (platform === '--list') {
      await list(args);
    } else {
      if (!platform || platform === 'help' || args.includes('--help') || args.includes('-h') || platform.startsWith('-')) {
        const help = await import('./help');
        return help.run();
      }

      throw new CLIException(`Unsupported platform: "${platform}"`, ERR_BAD_INPUT);
    }
  } catch (e) {
    debug('Caught fatal error: %O', e);
    process.exitCode = e instanceof Exception ? e.exitCode : 1;
    process.stdout.write(serializeError(e));
  }
}

async function list(args: string[]) {
  const [iosOutput, androidOutput] = await Promise.all([
    import('./ios/list').then(iosList => iosList.run(args)),
    import('./android/list').then(androidList => androidList.run(args)),
  ]);

  if (!args.includes('--json')) {
    process.stdout.write(`iOS ${iosOutput}\n`);
    process.stdout.write(`Android ${androidOutput}`);
  } else {
    const adjustLines = (output: string) => output.split('\n').map(line => `  ${line}`).join('\n').trim();
    process.stdout.write(`
{
  "ios": ${adjustLines(iosOutput)},
  "android": ${adjustLines(androidOutput)}
}`
    );
  }
}

function serializeError(e: Error): string {
  let error: string;
  let code: string | undefined;

  if (e instanceof Exception) {
    error = e.message;
    code = e.code;
  } else {
    error = String(e.stack ? e.stack : e);
  }

  if (process.argv.includes('--json')) {
    return JSON.stringify({ error, code });
  }

  return `${code ? code : 'ERR_UNKNOWN'}: ${error}\n`;
}
