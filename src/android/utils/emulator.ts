import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { ERR_ALREADY_RUNNING, ERR_AVD_HOME_NOT_FOUND, ERR_NON_ZERO_EXIT, ERR_UNKNOWN_AVD, EmulatorException } from '../../errors';
import { readFile } from '../../utils/fs';

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

    const eventParser = through2((chunk: string, enc, cb) => {
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

export async function getAVDFromEmulator(emulator: Device, avds: ReadonlyArray<AVD>): Promise<AVD> {
  const emulatorPortRegex = /^emulator-(\d+)$/;
  const m = emulator.serial.match(emulatorPortRegex);

  if (!m) {
    throw new EmulatorException(`Emulator ${emulator.serial} does not match expected emulator serial format`);
  }

  const port = Number.parseInt(m[1], 10);
  const host = 'localhost';
  const sock = net.createConnection({ host, port });
  sock.setEncoding('utf8');
  sock.setTimeout(5000);

  const readAuthFile = new Promise<string>((resolve, reject) => {
    sock.on('connect', () => {
      debug('Connected to %s:%d', host, port);
      readFile(path.resolve(os.homedir(), '.emulator_console_auth_token'), 'utf8')
        .then(contents => resolve(contents.trim()), err => reject(err));
    });
  });

  return new Promise<AVD>((resolve, reject) => {
    let stage: 'pre_auth' | 'auth' | 'post_auth' | 'avd_name' = 'pre_auth';

    sock.on('timeout', () => {
      reject(new EmulatorException(`Socket timeout on ${host}:${port}`));
      sock.end();
    });

    sock.pipe(split2()).pipe(through2((chunk: string, enc, cb) => {
      const line = chunk.toString();

      debug('Android Console: %O', line);

      if (stage === 'pre_auth' && line.includes('Authentication required')) {
        stage = 'auth';
      } else if (stage === 'auth' && line.trim() === 'OK') {
        readAuthFile.then(token => sock.write(`auth ${token}\n`, 'utf8'), err => reject(err));
        stage = 'post_auth';
      } else if (stage === 'post_auth' && line.trim() === 'OK') {
        sock.write('avd name\n', 'utf8');
        stage = 'avd_name';
      } else if (stage === 'avd_name') {
        const avdId = line.trim();
        const avd = avds.find(avd => avd.id === avdId);

        if (avd) {
          resolve(avd);
        } else {
          reject(new EmulatorException(`Unknown AVD name [${avdId}]`, ERR_UNKNOWN_AVD));
        }

        sock.end();
      }

      cb();
    }));
  });
}

export function parseAndroidConsoleResponse(output: string): string | undefined {
  const m = /([\s\S]+)OK\r?\n/g.exec(output);

  if (m) {
    const [ , response ] = m;
    debug('Parsed response data from Android Console output: %O', response);
    return response;
  }
}