import * as cp from 'child_process';
import * as Debug from 'debug';
import * as util from 'util';

import { once } from './fn';

const debug = Debug('native-run:utils:process');

export const exec = util.promisify(cp.exec);
export const execFile = util.promisify(cp.execFile);
export const wait = util.promisify(setTimeout);

export type ExitQueueFn = () => Promise<void>;

const exitQueue: ExitQueueFn[] = [];

export function onBeforeExit(fn: ExitQueueFn): void {
  exitQueue.push(fn);
}

const BEFORE_EXIT_SIGNALS: NodeJS.Signals[] = [
  'SIGINT',
  'SIGTERM',
  'SIGHUP',
  'SIGBREAK',
];

const beforeExitHandlerWrapper = (signal: NodeJS.Signals) =>
  once(async () => {
    debug('onBeforeExit handler: %s received', signal);
    debug(
      'onBeforeExit handler: running %s queued functions',
      exitQueue.length,
    );

    for (const [i, fn] of exitQueue.entries()) {
      try {
        await fn();
      } catch (e) {
        debug('Error from function %d in exit queue: %O', i, e);
      }
    }

    debug(
      'onBeforeExit handler: exiting (exit code %s)',
      process.exitCode ? process.exitCode : 0,
    );

    process.exit();
  });

for (const signal of BEFORE_EXIT_SIGNALS) {
  process.on(signal, beforeExitHandlerWrapper(signal));
}
