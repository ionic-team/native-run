import * as cp from 'child_process';
import * as Debug from 'debug';
import * as util from 'util';

const debug = Debug('native-run:utils:process');

export const exec = util.promisify(cp.exec);
export const execFile = util.promisify(cp.execFile);

export async function pkill(pid: number, signal = 'SIGTERM'): Promise<void> {
  const treekill = await import('tree-kill');

  return new Promise<void>((resolve, reject) => {
    treekill(pid, signal, err => {
      if (err) {
        debug('Error while killing process tree: %O', err);
        return reject(err);
      }

      resolve();
    });
  });
}
