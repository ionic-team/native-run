import { readFile } from '@ionic/utils-fs';
import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { ERR_ALREADY_RUNNING, ERR_AVD_HOME_NOT_FOUND, ERR_NON_ZERO_EXIT, ERR_UNKNOWN_AVD, EmulatorException } from '../../errors';
import { once } from '../../utils/fn';

import { Device, getDevices, waitForDevice } from './adb';
import { AVD } from './avd';
import { SDK, getSDKPackage, supplementProcessEnv } from './sdk';

const modulePrefix = 'native-run:android:utils:emulator';

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
  const debug = Debug(`${modulePrefix}:${spawnEmulator.name}`);
  const emulator = await getSDKPackage(path.join(sdk.root, 'emulator'));
  const emulatorBin = `${emulator.location}/emulator`;
  const args = ['-avd', avd.id, '-port', port.toString(), '-verbose'];
  debug('Invoking emulator: %O %O', emulatorBin, args);

  const p = spawn(emulatorBin, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: supplementProcessEnv(sdk) });
  p.unref();

  return new Promise<void>((_resolve, _reject) => {
    const resolve: typeof _resolve = once(() => { _resolve(); cleanup(); });
    const reject: typeof _reject = once(err => { _reject(err); cleanup(); });

    waitForDevice(sdk, `emulator-${port}`).then(() => resolve(), err => reject(err));

    const eventParser = through2((chunk: string, enc, cb) => {
      const line = chunk.toString();

      debug('Android Emulator: %O', line);
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
      debug('Unhooking stdout/stderr streams from emulator process');
      p.stdout.push(null);
      p.stderr.push(null);
    };

    p.on('close', code => {
      debug('Emulator closed, exit code %d', code);

      if (code > 0) {
        reject(new EmulatorException(`Non-zero exit code from Emulator: ${code}`, ERR_NON_ZERO_EXIT));
      }
    });

    p.on('error', err => {
      debug('Emulator error: %O', err);
      reject(err);
    });
  });
}

export enum EmulatorEvent {
  UnknownAVD, // AVD name was invalid
  AlreadyRunning, // already running with current AVD
  AVDHomeNotFound, // Cannot find AVD system path
}

export function parseEmulatorOutput(line: string): EmulatorEvent | undefined {
  const debug = Debug(`${modulePrefix}:${parseEmulatorOutput.name}`);
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

export async function getAVDFromEmulator(emulator: Device, avds: readonly AVD[]): Promise<AVD> {
  const debug = Debug(`${modulePrefix}:${getAVDFromEmulator.name}`);
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
      readFile(path.resolve(os.homedir(), '.emulator_console_auth_token'), { encoding: 'utf8' })
        .then(contents => resolve(contents.trim()), err => reject(err));
    });
  });

  enum Stage {
    Initial,
    Auth,
    AuthSuccess,
    Response,
    Complete,
  }

  return new Promise<AVD>((resolve, reject) => {
    let stage = Stage.Initial;

    const timer = setTimeout(() => {
      if (stage !== Stage.Complete) {
        reject(new EmulatorException(`Took too long to get AVD name from Android Emulator Console, something went wrong.`));
      }
    }, 3000);

    const cleanup = once(() => {
      clearTimeout(timer);
      sock.end();
    });

    sock.on('timeout', () => {
      reject(new EmulatorException(`Socket timeout on ${host}:${port}`));
      cleanup();
    });

    sock.pipe(split2()).pipe(through2((chunk: string, enc, cb) => {
      const line = chunk.toString();

      debug('Android Console: %O', line);

      if (stage === Stage.Initial && line.includes('Authentication required')) {
        stage = Stage.Auth;
      } else if (stage === Stage.Auth && line.trim() === 'OK') {
        readAuthFile.then(token => sock.write(`auth ${token}\n`, 'utf8'), err => reject(err));
        stage = Stage.AuthSuccess;
      } else if (stage === Stage.AuthSuccess && line.trim() === 'OK') {
        sock.write('avd name\n', 'utf8');
        stage = Stage.Response;
      } else if (stage === Stage.Response) {
        const avdId = line.trim();
        const avd = avds.find(avd => avd.id === avdId);

        if (avd) {
          resolve(avd);
        } else {
          reject(new EmulatorException(`Unknown AVD name [${avdId}]`, ERR_UNKNOWN_AVD));
        }

        stage = Stage.Complete;
        cleanup();
      }

      cb();
    }));
  });
}

export function parseAndroidConsoleResponse(output: string): string | undefined {
  const debug = Debug(`${modulePrefix}:${parseAndroidConsoleResponse.name}`);
  const m = /([\s\S]+)OK\r?\n/g.exec(output);

  if (m) {
    const [ , response ] = m;
    debug('Parsed response data from Android Console output: %O', response);
    return response;
  }
}
