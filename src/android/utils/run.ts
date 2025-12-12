import * as Debug from 'debug';

import {
  ADBException,
  AndroidRunException,
  ERR_INCOMPATIBLE_UPDATE,
  ERR_NO_TARGET,
  ERR_VERSION_DOWNGRADE,
} from '../../errors';
import { log } from '../../utils/log';

import type { Device } from './adb';
import { installApk, uninstallApp } from './adb';
import type { AVD } from './avd';
import { getAVDFromEmulator, runEmulator } from './emulator';
import type { SDK } from './sdk';

const modulePrefix = 'native-run:android:utils:run';

async function findAvailableEmulatorPort(devices: readonly Device[], start = 5554, end = 5584): Promise<number> {
  const debug = Debug(`${modulePrefix}:${findAvailableEmulatorPort.name}`);
  const usedPorts = new Set<number>();

  for (const d of devices) {
    const m = d.serial.match(/^emulator-(\d+)$/);
    if (m) {
      usedPorts.add(Number(m[1]));
    }
  }

  for (let port = start; port <= end; port += 2) {
    if (!usedPorts.has(port)) {
      debug('Available emulator port found: %d', port);
      return port;
    }
  }

  debug('No available emulator ports found in range %d-%d; defaulting to 5554', start, end);
  return 5554;
}

export async function selectDeviceByTarget(
  sdk: SDK,
  devices: readonly Device[],
  avds: readonly AVD[],
  target: string,
): Promise<Device | undefined> {
  const debug = Debug(`${modulePrefix}:${selectDeviceByTarget.name}`);

  debug('--target %s detected', target);
  debug('Checking if device can be found by serial: %s', target);
  const device = devices.find((d) => d.serial === target);

  if (device) {
    debug('Device found by serial: %s', device.serial);
    return device;
  }

  const emulatorDevices = devices.filter((d) => d.type === 'emulator');

  const pairAVD = async (emulator: Device): Promise<[Device, AVD | undefined]> => {
    let avd: AVD | undefined;

    try {
      avd = await getAVDFromEmulator(emulator, avds);
      debug('Emulator %s is using AVD: %s', emulator.serial, avd.id);
    } catch (e) {
      debug('Error with emulator %s: %O', emulator.serial, e);
    }

    return [emulator, avd];
  };

  debug('Checking if any of %d running emulators are using AVD by ID: %s', emulatorDevices.length, target);
  const emulatorsAndAVDs = await Promise.all(emulatorDevices.map((emulator) => pairAVD(emulator)));
  const emulators = emulatorsAndAVDs.filter((t): t is [Device, AVD] => typeof t[1] !== 'undefined');
  const emulator = emulators.find(([, avd]) => avd.id === target);

  if (emulator) {
    const [device, avd] = emulator;
    debug('Emulator %s found by AVD: %s', device.serial, avd.id);
    return device;
  }

  debug('Checking if AVD can be found by ID: %s', target);
  const avd = avds.find((avd) => avd.id === target);

  if (avd) {
    debug('AVD found by ID: %s', avd.id);
    const port = await findAvailableEmulatorPort(devices);
    debug('Using emulator port: %d', port);
    const device = await runEmulator(sdk, avd, port);
    debug('Emulator ready, running avd: %s on %s', avd.id, device.serial);

    return device;
  }
}

export async function selectHardwareDevice(devices: readonly Device[]): Promise<Device | undefined> {
  const hardwareDevices = devices.filter((d) => d.type === 'hardware');

  // If a hardware device is found, we prefer launching to it instead of in an emulator.
  if (hardwareDevices.length > 0) {
    return hardwareDevices[0]; // TODO: can probably do better analysis on which to use?
  }
}

export async function selectVirtualDevice(sdk: SDK, devices: readonly Device[], avds: readonly AVD[]): Promise<Device> {
  const debug = Debug(`${modulePrefix}:${selectVirtualDevice.name}`);
  const emulators = devices.filter((d) => d.type === 'emulator');

  // If an emulator is running, use it.
  if (emulators.length > 0) {
    const [emulator] = emulators;
    debug('Found running emulator: %s', emulator.serial);
    return emulator;
  }
  throw new AndroidRunException('No target devices/emulators available.', ERR_NO_TARGET);
}

export async function installApkToDevice(sdk: SDK, device: Device, apk: string, appId: string): Promise<void> {
  log(`Installing ${apk}...\n`);

  try {
    await installApk(sdk, device, apk);
  } catch (e) {
    if (e instanceof ADBException) {
      if (e.code === ERR_INCOMPATIBLE_UPDATE || e.code === ERR_VERSION_DOWNGRADE) {
        log(`${e.message} Uninstalling and trying again...\n`);
        await uninstallApp(sdk, device, appId);
        await installApk(sdk, device, apk);
        return;
      }
    }

    throw e;
  }
}
