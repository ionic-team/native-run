import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { pkill } from '../../utils/process';

import { SDK } from './sdk';

const debug = Debug('native-run:android:utils:emulator');

export const ERR_UNKNOWN_AVD = 'ERR_UNKNOWN_AVD';
export type EmulatorErrorCode = typeof ERR_UNKNOWN_AVD;

export class EmulatorError extends Error implements NodeJS.ErrnoException {
  constructor(readonly message: string, readonly code: EmulatorErrorCode) {
    super(message);
  }
}

/**
 * Resolves when emulator is ready and running with the specified AVD.
 */
export function runEmulator(sdk: SDK, avd: string): Promise<void> {
  const emulatorBin = `${sdk.emulator.path}/emulator`;
  const args = ['-avd', avd];
  debug('Invoking emulator: %O %O', emulatorBin, args);

  const p = spawn(emulatorBin, args, { stdio: 'pipe' }); // TODO: use emulator bin from sdk info

  process.on('SIGINT', async () => {
    debug('Received SIGINT, sending SIGTERM to emulator');

    if (p.pid) {
      await pkill(p.pid, 'SIGTERM'); // TODO: handle failure
    }
  });

  return new Promise<void>((resolve, reject) => {
    setTimeout(() => resolve(), 5000); // TODO: reliably know when ready

    p.on('close', code => {
      debug('emulator closed, exit code %d', code);
    });

    // The Android Emulator does not seem to use stderr, so only pipe stdout
    p.stdout.pipe(split2()).pipe(through2((chunk, enc, cb) => {
      const line = chunk.toString();

      debug('emulator: %O', line);
      const event = parseEmulatorOutput(line);

      if (event === EmulatorEvent.UnknownAVD) {
        reject(new EmulatorError(`Unknown AVD name [${avd}]`, ERR_UNKNOWN_AVD));
      } else if (event === EmulatorEvent.AlreadyRunning) {
        resolve();
      }

      cb();
    }));
  });
}

export enum EmulatorEvent {
  UnknownAVD, // AVD name was invalid
  AlreadyRunning, // already running with current AVD
}

export function parseEmulatorOutput(line: string): EmulatorEvent | undefined {
  let event: EmulatorEvent | undefined;

  if (line.includes('Unknown AVD name')) {
    event = EmulatorEvent.UnknownAVD;
  } else if (line.includes('another emulator instance running with the current AVD')) {
    event = EmulatorEvent.AlreadyRunning;
  }

  if (typeof event !== 'undefined') {
    debug('Parsed event from emulator output: %s', EmulatorEvent[event]);
  }

  return event;
}
