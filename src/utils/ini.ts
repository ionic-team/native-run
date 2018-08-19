import * as Debug from 'debug';
import * as util from 'util';

import { readFile } from './fs';

const debug = Debug('native-run:android:utils:ini');

export type INIGuard<T extends object> = (o: any) => o is T;

export async function readINI<T extends object>(p: string, guard: INIGuard<T> = (o: any): o is T => true): Promise<T | undefined> {
  const ini = await import('ini');

  try {
    const contents = await readFile(p, 'utf8');
    const config = ini.decode(contents);

    if (!guard(config)) {
      throw new Error(
        `Invalid ini configuration file: ${p}\n` +
        `The following guard was used: ${guard.toString()}\n` +
        `INI config parsed as: ${util.inspect(config)}`
      );
    }

    return { __filename: p, ...config as any };
  } catch (e) {
    debug(e);
  }
}
