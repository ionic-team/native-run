import * as Debug from 'debug';
import * as util from 'util';

import { readFile } from '../../utils/fs';

const debug = Debug('native-run:android:utils:properties');

export type PropertiesGuard<T extends object> = (o: any) => o is T;

/**
 * Poorly implemented: only handles `key=value` (badly), no multiline, ignores comments.
 */
export async function readProperties<T extends object>(p: string, guard: PropertiesGuard<T> = (o: any): o is T => true): Promise<T | undefined> {
  try {
    const contents = await readFile(p, 'utf8');

    const config = contents
      .split('\n')
      .map(l => l.split('='))
      .reduce((acc, [ k, v ]) => {
        if (k && v) {
          acc[k.trim()] = v.trim();
        }

        return acc;
      }, {} as { [key: string]: string; });

    if (!guard(config)) {
      throw new Error(
        `Invalid properties configuration file: ${p}\n` +
        `The following guard was used: ${guard.toString()}\n` +
        `Properties config parsed as: ${util.inspect(config)}`
      );
    }

    return config;
  } catch (e) {
    debug(e);
  }
}
