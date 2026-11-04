import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as through2 from 'through2';

import {
  ADBException,
  ERR_DEVICE_OFFLINE,
  ERR_INCOMPATIBLE_UPDATE,
  ERR_MIN_SDK_VERSION,
  ERR_NOT_ENOUGH_SPACE,
  ERR_NO_CERTIFICATES,
  ERR_VERSION_DOWNGRADE,
} from '../../errors';
import { execFile } from '../../utils/process';

import type { SDK } from './sdk';
import { getSDKPackage, supplementProcessEnv } from './sdk';

const modulePrefix = 'native-run:android:utils:adb';

export interface Ports {
  readonly device: string;
  readonly host: string;
}

export interface DeviceProperties {
  [key: string]: string | undefined;
}

export interface MappedDeviceProps {
  manufacturer: string;
  model: string;
  product: string;
  sdkVersion: string;
}

export interface Device extends MappedDeviceProps {
  serial: string;
  state: string; // 'offline' | 'device' | 'no device'
  type: 'emulator' | 'hardware';
  connection: 'usb' | 'tcpip' | null;
  properties: DeviceProperties;
}

const ADB_GETPROP_MAP: ReadonlyMap<string, keyof MappedDeviceProps> = new Map<string, keyof MappedDeviceProps>([
  ['ro.product.manufacturer', 'manufacturer'],
  ['ro.product.model', 'model'],
  ['ro.product.name', 'product'],
  ['ro.build.version.sdk', 'sdkVersion'],
]);

export async function getDevices(sdk: SDK): Promise<Device[]> {
  const debug = Debug(`${modulePrefix}:${getDevices.name}`);
  const args = ['devices', '-l'];

  debug('Invoking adb with args: %O', args);
  const stdout = await execAdb(sdk, args, { timeout: 5000 });

  const devices = parseAdbDevices(stdout);

  await Promise.all(
    devices.map(async (device) => {
      const properties = await getDeviceProperties(sdk, device);

      for (const [prop, deviceProp] of ADB_GETPROP_MAP.entries()) {
        const value = properties[prop];

        if (value) {
          device[deviceProp] = value;
        }
      }
    }),
  );

  debug('Found adb devices: %O', devices);

  return devices;
}

export async function getDeviceProperty(sdk: SDK, device: Device, property: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${getDeviceProperty.name}`);
  const args = ['-s', device.serial, 'shell', 'getprop', property];

  debug('Invoking adb with args: %O', args);
  const stdout = await execAdb(sdk, args, { timeout: 5000 });

  return stdout.trim();
}

export async function getDeviceProperties(sdk: SDK, device: Device): Promise<DeviceProperties> {
  const debug = Debug(`${modulePrefix}:${getDeviceProperties.name}`);
  const args = ['-s', device.serial, 'shell', 'getprop'];

  debug('Invoking adb with args: %O', args);
  const stdout = await execAdb(sdk, args, { timeout: 5000 });

  const re = /^\[([a-z0-9.]+)\]: \[(.*)\]$/;
  const propAllowList = [...ADB_GETPROP_MAP.keys()];
  const properties: DeviceProperties = {};

  for (const line of stdout.split(os.EOL)) {
    const m = line.match(re);

    if (m) {
      const [, key, value] = m;

      if (propAllowList.includes(key)) {
        properties[key] = value;
      }
    }
  }

  return properties;
}

export async function waitForDevice(sdk: SDK, serial: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${waitForDevice.name}`);
  const args = ['-s', serial, 'wait-for-any-device'];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args);

  debug('Device %s is connected to ADB!', serial);
}

export async function waitForBoot(sdk: SDK, device: Device): Promise<void> {
  const debug = Debug(`${modulePrefix}:${waitForBoot.name}`);

  return new Promise<void>((resolve) => {
    const interval = setInterval(async () => {
      const booted = await getDeviceProperty(sdk, device, 'dev.bootcomplete');

      if (booted) {
        debug('Device %s is booted!', device.serial);
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

export async function waitForClose(sdk: SDK, device: Device, app: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${waitForClose.name}`);
  const args = ['-s', device.serial, 'shell', `ps | grep ${app}`];

  return new Promise<void>((resolve) => {
    const interval = setInterval(async () => {
      try {
        debug('Invoking adb with args: %O', args);
        await execAdb(sdk, args);
      } catch (e) {
        debug('Error received from adb: %O', e);
        debug('App %s no longer found in process list for %s', app, device.serial);
        clearInterval(interval);
        resolve();
      }
    }, 500);
  });
}

export async function installApk(sdk: SDK, device: Device, apk: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${installApk.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = path.join(platformTools.location, 'adb');
  const args = ['-s', device.serial, 'install', '-r', '-t', apk];
  debug('Invoking adb with args: %O', args);

  const p = spawn(adbBin, args, {
    stdio: 'pipe',
    env: supplementProcessEnv(sdk),
  });

  return new Promise<void>((resolve, reject) => {
    p.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new ADBException(`Non-zero exit code from adb: ${code}`));
      }
    });

    p.on('error', (err) => {
      debug('adb install error: %O', err);
      reject(err);
    });

    p.stderr.pipe(split2()).pipe(
      through2((chunk, enc, cb) => {
        const line = chunk.toString();

        debug('adb install: %O', line);
        const event = parseAdbInstallOutput(line);

        if (event === ADBEvent.IncompatibleUpdateFailure) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_INCOMPATIBLE_UPDATE));
        } else if (event === ADBEvent.NewerVersionOnDeviceFailure) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_VERSION_DOWNGRADE));
        } else if (event === ADBEvent.NewerSdkRequiredOnDeviceFailure) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_MIN_SDK_VERSION));
        } else if (event === ADBEvent.NoCertificates) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_NO_CERTIFICATES));
        } else if (event === ADBEvent.NotEnoughSpace) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_NOT_ENOUGH_SPACE));
        } else if (event === ADBEvent.DeviceOffline) {
          reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_DEVICE_OFFLINE));
        }

        cb();
      }),
    );
  });
}

export async function closeApp(sdk: SDK, device: Device, app: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${closeApp.name}`);
  const args = ['-s', device.serial, 'shell', 'am', 'force-stop', app];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args);
}

export async function uninstallApp(sdk: SDK, device: Device, app: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${uninstallApp.name}`);
  const args = ['-s', device.serial, 'uninstall', app];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args);
}

export enum ADBEvent {
  IncompatibleUpdateFailure, // signatures do not match the previously installed version
  NewerVersionOnDeviceFailure, // version of app on device is newer than the one being deployed
  NewerSdkRequiredOnDeviceFailure, // device does not meet minSdkVersion requirement
  NoCertificates, // no certificates in APK, likely due to improper signing config
  NotEnoughSpace, // device is out of hard drive space
  DeviceOffline, // device is off or needs to be woken up
}

export function parseAdbInstallOutput(line: string): ADBEvent | undefined {
  const debug = Debug(`${modulePrefix}:${parseAdbInstallOutput.name}`);
  let event: ADBEvent | undefined;

  if (line.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
    event = ADBEvent.IncompatibleUpdateFailure;
  } else if (line.includes('INSTALL_FAILED_VERSION_DOWNGRADE')) {
    event = ADBEvent.NewerVersionOnDeviceFailure;
  } else if (line.includes('INSTALL_FAILED_OLDER_SDK')) {
    event = ADBEvent.NewerSdkRequiredOnDeviceFailure;
  } else if (line.includes('INSTALL_PARSE_FAILED_NO_CERTIFICATES')) {
    event = ADBEvent.NoCertificates;
  } else if (line.includes('INSTALL_FAILED_INSUFFICIENT_STORAGE') || line.includes('not enough space')) {
    event = ADBEvent.NotEnoughSpace;
  } else if (line.includes('device offline')) {
    event = ADBEvent.DeviceOffline;
  }

  if (typeof event !== 'undefined') {
    debug('Parsed event from adb install output: %s', ADBEvent[event]);
  }

  return event;
}

export async function startActivity(
  sdk: SDK,
  device: Device,
  packageName: string,
  activityName: string,
  timeout: number,
): Promise<void> {
  const debug = Debug(`${modulePrefix}:${startActivity.name}`);
  const args = ['-s', device.serial, 'shell', 'am', 'start', '-W', '-n', `${packageName}/${activityName}`];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args, { timeout: timeout });
}

export function parseAdbDevices(output: string): Device[] {
  const debug = Debug(`${modulePrefix}:${parseAdbDevices.name}`);
  const re = /^([\S]+)\s+([a-z\s]+)\s+(.*)$/;
  const ipRe = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/;
  const lines = output.split(os.EOL);

  debug('Parsing adb devices from output lines: %O', lines);

  const devices: Device[] = [];

  for (const line of lines) {
    if (line && !line.startsWith('List')) {
      const m = line.match(re);

      if (m) {
        const [, serial, state, description] = m;
        const properties = description
          .split(/\s+/)
          .map((prop) => (prop.includes(':') ? prop.split(':') : undefined))
          .filter((kv): kv is [string, string] => typeof kv !== 'undefined' && kv.length >= 2)
          .reduce(
            (acc, [k, v]) => {
              if (k && v) {
                acc[k.trim()] = v.trim();
              }

              return acc;
            },
            {} as { [key: string]: string | undefined },
          );

        const isIP = !!serial.match(ipRe);
        const isGenericDevice = (properties['device'] || '').startsWith('generic');
        const type =
          'usb' in properties || isIP || !serial.startsWith('emulator') || !isGenericDevice ? 'hardware' : 'emulator';
        const connection = 'usb' in properties ? 'usb' : isIP ? 'tcpip' : null;

        devices.push({
          serial,
          state,
          type,
          connection,
          properties,
          // We might not know these yet
          manufacturer: '',
          model: properties['model'] || '',
          product: properties['product'] || '',
          sdkVersion: '',
        });
      } else {
        debug('adb devices output line does not match expected regex: %O', line);
      }
    }
  }

  return devices;
}

export async function forwardPorts(sdk: SDK, device: Device, ports: Ports): Promise<void> {
  const debug = Debug(`${modulePrefix}:${forwardPorts.name}`);
  const args = ['-s', device.serial, 'reverse', `tcp:${ports.device}`, `tcp:${ports.host}`];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args, { timeout: 5000 });
}

export async function unforwardPorts(sdk: SDK, device: Device, ports: Ports): Promise<void> {
  const debug = Debug(`${modulePrefix}:${unforwardPorts.name}`);
  const args = ['-s', device.serial, 'reverse', '--remove', `tcp:${ports.device}`];

  debug('Invoking adb with args: %O', args);
  await execAdb(sdk, args, { timeout: 5000 });
}

export interface ExecADBOptions {
  timeout?: number;
}

export async function execAdb(sdk: SDK, args: string[], options: ExecADBOptions = {}): Promise<string> {
  const debug = Debug(`${modulePrefix}:${execAdb.name}`);
  let timer: NodeJS.Timer | undefined;

  const retry = async () => {
    const msg = `ADBs is unresponsive after ${options.timeout}ms, killing server and retrying...\n`;
    if (process.argv.includes('--json')) {
      debug(msg);
    } else {
      process.stderr.write(msg);
    }

    debug('ADB timeout of %O reached, killing server and retrying...', options.timeout);
    debug('Invoking adb with args: %O', ['kill-server']);
    await execAdb(sdk, ['kill-server']);
    debug('Invoking adb with args: %O', ['start-server']);
    await execAdb(sdk, ['start-server']);
    debug('Retrying...');
    return run();
  };

  const run = async () => {
    const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
    const adbBin = path.join(platformTools.location, 'adb');
    const { stdout } = await execFile(adbBin, args, {
      env: supplementProcessEnv(sdk),
    });

    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    return stdout;
  };

  return new Promise((resolve, reject) => {
    if (options.timeout) {
      timer = setTimeout(() => retry().then(resolve, reject), options.timeout);
    }

    run().then(resolve, (err) => {
      if (!timer) {
        reject(err);
      }
    });
  });
}
