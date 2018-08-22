import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { ERR_ALREADY_RUNNING, ERR_AVD_HOME_NOT_FOUND, ERR_NON_ZERO_EXIT, ERR_UNKNOWN_AVD, EmulatorException } from '../../errors';

import { Device, getDevices, waitForDevice } from './adb';
import { AVD } from './avd';
import { SDK } from './sdk';

const debug = Debug('native-run:android:utils:emulator');

/**
 * Resolves when emulator is ready and running with the specified AVD.
 */
export async function runEmulator(sdk: SDK, avd: AVD, port: number): Promise<Device> {
  try {
    await spawnEmulator(sdk, avd, port);
  } catch (e) {
    if (!(e instanceof EmulatorException) || e.code !== ERR_ALREADY_RUNNING) {
      throw e;
    }
  }

  const serial = `emulator-${port}`;
  const devices = await getDevices(sdk);
  const emulator = devices.find(device => device.serial === serial);

  if (!emulator) {
    throw new EmulatorException(`Emulator not found: ${serial}`);
  }

  return emulator;
}

export async function spawnEmulator(sdk: SDK, avd: AVD, port: number): Promise<void> {
  const emulatorBin = `${sdk.emulator.path}/emulator`;
  const args = ['-avd', avd.id, '-port', port.toString()];
  debug('Invoking emulator: %O %O', emulatorBin, args);

  const p = spawn(emulatorBin, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  p.unref();

  return new Promise<void>((resolve, reject) => {
    waitForDevice(sdk, `emulator-${port}`).then(() => resolve(), () => { /* TODO */ });

    const eventParser = through2((chunk, enc, cb) => {
      const line = chunk.toString();

      debug('emulator: %O', line);
      const event = parseEmulatorOutput(line);

      if (event === EmulatorEvent.AlreadyRunning) {
        reject(new EmulatorException(`Emulator already running with AVD [${avd.id}]`, ERR_ALREADY_RUNNING));
      } else if (event === EmulatorEvent.UnknownAVD) {
        reject(new EmulatorException(`Unknown AVD name [${avd.id}]`, ERR_UNKNOWN_AVD));
      } else if (event === EmulatorEvent.AVDHomeNotFound) {
        reject(new EmulatorException(`Emulator cannot find AVD home`, ERR_AVD_HOME_NOT_FOUND));
      }

      cb();
    });

    const stdoutStream = p.stdout.pipe(split2());
    const stderrStream = p.stderr.pipe(split2());

    stdoutStream.pipe(eventParser);
    stderrStream.pipe(eventParser);

    const cleanup = () => {
      stdoutStream.unpipe(eventParser);
      stderrStream.unpipe(eventParser);
    };

    p.on('close', code => {
      debug('emulator closed, exit code %d', code);

      if (code > 0) {
        reject(new EmulatorException(`Non-zero exit code from emulator: ${code}`, ERR_NON_ZERO_EXIT));
      }

      cleanup();
    });

    p.on('error', err => {
      debug('emulator error: %O', err);
      reject(err);
      cleanup();
    });
  });
}

export enum EmulatorEvent {
  UnknownAVD, // AVD name was invalid
  AlreadyRunning, // already running with current AVD
  AVDHomeNotFound, // Cannot find AVD system path
}

export function parseEmulatorOutput(line: string): EmulatorEvent | undefined {
  let event: EmulatorEvent | undefined;

  if (line.includes('Unknown AVD name')) {
    event = EmulatorEvent.UnknownAVD;
  } else if (line.includes('another emulator instance running with the current AVD')) {
    event = EmulatorEvent.AlreadyRunning;
  } else if (line.includes('Cannot find AVD system path')) {
    event = EmulatorEvent.AVDHomeNotFound;
  }

  if (typeof event !== 'undefined') {
    debug('Parsed event from emulator output: %s', EmulatorEvent[event]);
  }

  return event;
}
