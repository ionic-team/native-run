import { spawn } from 'child_process';
import * as Debug from 'debug';
import * as os from 'os';
import * as path from 'path';
import * as split2 from 'split2';
import * as through2 from 'through2';

import { ADBException, ERR_INCOMPATIBLE_UPDATE, ERR_VERSION_DOWNGRADE } from '../../errors';
import { execFile } from '../../utils/process';

import { SDK, getSDKPackage, supplementProcessEnv } from './sdk';

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
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['devices', '-l'];
  debug('Invoking adb: %O %O', adbBin, args);

  const { stdout } = await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });

  const devices = parseAdbDevices(stdout);

  await Promise.all(devices.map(async device => {
    const properties = await getDeviceProperties(sdk, device);

    for (const [ prop, deviceProp ] of ADB_GETPROP_MAP.entries()) {
      const value = properties[prop];

      if (value) {
        device[deviceProp] = value;
      }
    }
  }));

  debug('Found adb devices: %O', devices);

  return devices;
}

export async function getDeviceProperty(sdk: SDK, device: Device, property: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${getDeviceProperty.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'shell', 'getprop', property];
  debug('Invoking adb: %O %O', adbBin, args);

  const { stdout } = await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });

  return stdout.trim();
}

export async function getDeviceProperties(sdk: SDK, device: Device): Promise<DeviceProperties> {
  const debug = Debug(`${modulePrefix}:${getDeviceProperties.name}`);
  const re = /^\[([a-z0-9\.]+)\]: \[(.*)\]$/;
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'shell', 'getprop'];
  debug('Invoking adb: %O %O', adbBin, args);
  const propAllowList = [...ADB_GETPROP_MAP.keys()];

  const { stdout } = await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
  const properties: DeviceProperties = {};

  for (const line of stdout.split(os.EOL)) {
    const m = line.match(re);

    if (m) {
      const [ , key, value ] = m;

      if (propAllowList.includes(key)) {
        properties[key] = value;
      }
    }
  }

  return properties;
}

export async function waitForDevice(sdk: SDK, serial: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${waitForDevice.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', serial, 'wait-for-any-device'];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });

  debug('Device %s is connected to ADB!', serial);
}

export async function waitForBoot(sdk: SDK, device: Device): Promise<void> {
  const debug = Debug(`${modulePrefix}:${waitForBoot.name}`);

  return new Promise<void>(resolve => {
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
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'shell', `ps | grep ${app}`];

  return new Promise<void>(resolve => {
    const interval = setInterval(async () => {
      debug('Invoking adb: %O %O', adbBin, args);

      try {
        await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
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
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'install', '-r', '-t', apk];
  debug('Invoking adb: %O %O', adbBin, args);

  const p = spawn(adbBin, args, { stdio: 'pipe', env: supplementProcessEnv(sdk) });

  return new Promise<void>((resolve, reject) => {
    p.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new ADBException(`Non-zero exit code from adb: ${code}`));
      }
    });

    p.on('error', err => {
      debug('adb install error: %O', err);
      reject(err);
    });

    p.stderr.pipe(split2()).pipe(through2((chunk, enc, cb) => {
      const line = chunk.toString();

      debug('adb install: %O', line);
      const event = parseAdbInstallOutput(line);

      if (event === ADBEvent.IncompatibleUpdateFailure) {
        reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_INCOMPATIBLE_UPDATE));
      } else if (event === ADBEvent.NewerVersionOnDeviceFailure) {
        reject(new ADBException(`Encountered adb error: ${ADBEvent[event]}.`, ERR_VERSION_DOWNGRADE));
      }

      cb();
    }));
  });
}

export async function closeApp(sdk: SDK, device: Device, app: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${closeApp.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'shell', 'am', 'force-stop', app];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
}

export async function uninstallApp(sdk: SDK, device: Device, app: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${uninstallApp.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'uninstall', app];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
}

export enum ADBEvent {
  IncompatibleUpdateFailure, // signatures do not match the previously installed version
  NewerVersionOnDeviceFailure, // version of app on device is newer than the one being deployed
}

export function parseAdbInstallOutput(line: string): ADBEvent | undefined {
  const debug = Debug(`${modulePrefix}:${parseAdbInstallOutput.name}`);
  let event: ADBEvent | undefined;

  if (line.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
    event = ADBEvent.IncompatibleUpdateFailure;
  } else if (line.includes('INSTALL_FAILED_VERSION_DOWNGRADE')) {
    event = ADBEvent.NewerVersionOnDeviceFailure;
  }

  if (typeof event !== 'undefined') {
    debug('Parsed event from adb install output: %s', ADBEvent[event]);
  }

  return event;
}

export async function startActivity(sdk: SDK, device: Device, packageName: string, activityName: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${startActivity.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'shell', 'am', 'start', '-W', '-n', `${packageName}/${activityName}`];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
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
        const [ , serial, state, description ] = m;
        const properties = description
          .split(/\s+/)
          .map(prop => prop.includes(':') ? prop.split(':') : undefined)
          .filter((kv: any): kv is [string, string] => typeof kv !== 'undefined' && typeof kv[0] === 'string' && typeof kv[1] === 'string')
          .reduce((acc, [ k, v ]) => {
            if (k && v) {
              acc[k.trim()] = v.trim();
            }

            return acc;
          }, {} as { [key: string]: string; });

        const isIP = !!serial.match(ipRe);
        const type = 'usb' in properties || isIP ? 'hardware' : 'emulator';
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
          product: '',
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
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'reverse', `tcp:${ports.device}`, `tcp:${ports.host}`];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
}

export async function unforwardPorts(sdk: SDK, device: Device, ports: Ports): Promise<void> {
  const debug = Debug(`${modulePrefix}:${forwardPorts.name}`);
  const platformTools = await getSDKPackage(path.join(sdk.root, 'platform-tools'));
  const adbBin = `${platformTools.location}/adb`;
  const args = ['-s', device.serial, 'reverse', '--remove', `tcp:${ports.device}`];
  debug('Invoking adb: %O %O', adbBin, args);

  await execFile(adbBin, args, { env: supplementProcessEnv(sdk) });
}
