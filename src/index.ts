import * as Debug from 'debug';
import * as path from 'path';

import { CLIException, ERR_BAD_INPUT, Exception } from './errors';
import { stringify } from './utils/json';

const debug = Debug('native-run');

export interface Command {
  readonly run: (args: ReadonlyArray<string>) => Promise<void>;
}

export async function run(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--version')) {
    const pkg = await import(path.resolve(__dirname, '../package.json'));
    process.stdout.write(pkg.version + '\n');
    return;
  }

  let cmd: Command;
  const [ platform, ...platformArgs ] = args;

  try {
    if (platform === 'android') {
      cmd = await import('./android');
      await cmd.run(platformArgs);
    } else if (platform === 'ios') {
      cmd = await import('./ios');
      await cmd.run(platformArgs);
    } else if (platform === '--list') {
      cmd = await import('./list');
      await cmd.run(args);
    } else {
      if (!platform || platform === 'help' || args.includes('--help') || args.includes('-h') || platform.startsWith('-')) {
        cmd = await import('./help');
        return cmd.run(args);
      }

      throw new CLIException(`Unsupported platform: "${platform}"`, ERR_BAD_INPUT);
    }
  } catch (e) {
    debug('Caught fatal error: %O', e);
    process.exitCode = e instanceof Exception ? e.exitCode : 1;
    process.stdout.write(serializeError(e));
  }
}

function serializeError(e: Error): string {
  const stack = String(e.stack ? e.stack : e);

  if (process.argv.includes('--json')) {
    return stringify(e instanceof Exception ? e : { error: stack });
  }

  return (e instanceof Exception ? e.serialize() : stack) + '\n';
}
