import * as Debug from 'debug';

import { ADBException, ERR_INCOMPATIBLE_UPDATE, RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { Device, getDevices, installApk, startActivity, uninstallApp, waitForBoot } from './utils/adb';
import { AVD, getAVDs, getDefaultAVD } from './utils/avd';
import { getAVDFromEmulator, runEmulator } from './utils/emulator';
import { SDK, getSDK } from './utils/sdk';

const debug = Debug('native-run:android:run');

export async function run(args: string[]) {
  const sdk = await getSDK();
  const apk = getOptionValue(args, '--apk');
  // TODO: get application id and activity from apk
  const app = getOptionValue(args, '--app');
  const activity = getOptionValue(args, '--activity', '.MainActivity');

  if (!apk) {
    throw new RunException('--apk is required');
  }

  if (!app) {
    throw new RunException('--app is required');
  }

  const device = await selectDevice(sdk, args);

  process.stdout.write(`Selected ${device.type === 'hardware' ? 'hardware device' : 'emulator'} ${device.serial}\n`);

  await waitForBoot(sdk, device);
  await installApkToDevice(sdk, device, apk, app);

  process.stdout.write(`Starting application activity ${app}/${activity}...\n`);
  await startActivity(sdk, device, app, activity);

  process.stdout.write(`Run Successful\n`);
}

export async function selectDevice(sdk: SDK, args: string[]): Promise<Device> {
  const devices = await getDevices(sdk);
  const avds = await getAVDs(sdk);

  const targetedDevice = await selectDeviceByTarget(devices, avds, args);

  if (targetedDevice) {
    return targetedDevice;
  }

  const selectedDevice = await selectDeviceByDevice(devices, args);

  if (selectedDevice) {
    return selectedDevice;
  }

  return selectDeviceByEmulator(sdk, devices, avds);
}

export async function selectDeviceByTarget(devices: ReadonlyArray<Device>, avds: ReadonlyArray<AVD>, args: string[]): Promise<Device | undefined> {
  const target = getOptionValue(args, '--target');

  if (target) {
    debug('%s: --target %s detected', selectDeviceByTarget.name, target);
    debug('%s: Checking if device can be found by serial: %s', selectDeviceByTarget.name, target);
    const device = devices.find(d => d.serial === target);

    if (device) {
      debug('%s: Device found by serial: %s', selectDeviceByTarget.name, device.serial);
      return device;
    }

    const emulatorDevices = devices.filter(d => d.type === 'emulator');
    debug('%s: Checking if any of %d running emulators are using AVD by ID: %s', selectDeviceByTarget.name, emulatorDevices.length, target);

    const emulators = (await Promise.all(emulatorDevices.map(async (emulator): Promise<[Device, AVD] | undefined> => {
      try {
        const avd = await getAVDFromEmulator(emulator, avds);
        debug('%s: Emulator %s is using AVD: %s', selectDeviceByTarget.name, emulator.serial, avd.id);
        return [ emulator, avd ];
      } catch (e) {
        debug('%s: Error with emulator %s: %O', selectDeviceByTarget.name, emulator.serial, e);
      }
    }))).filter((t): t is [Device, AVD] => typeof t !== 'undefined');

    const emulator = emulators.find(([ , avd ]) => avd.id === target);

    if (emulator) {
      const [ device, avd ] = emulator;
      debug('%s: Emulator %s found by AVD: %s', selectDeviceByTarget.name, device.serial, avd.id);
      return device;
    }
  }
}

export async function selectDeviceByDevice(devices: ReadonlyArray<Device>, args: string[]): Promise<Device | undefined> {
  const preferEmulator = args.includes('--emulator');

  if (!preferEmulator) {
    const hardwareDevices = devices.filter(d => d.type === 'hardware');

    // If a hardware device is found, we prefer launching to it instead of in an emulator.
    if (hardwareDevices.length > 0) {
      return hardwareDevices[0]; // TODO: can probably do better analysis on which to use?
    }
  }
}

export async function selectDeviceByEmulator(sdk: SDK, devices: ReadonlyArray<Device>, avds: ReadonlyArray<AVD>): Promise<Device> {
  const emulatorDevices = devices.filter(d => d.type === 'emulator');

  if (emulatorDevices.length > 0) {
    const [ emulator ] = emulatorDevices;
    debug('%s: Found running emulator: %s', selectDeviceByEmulator.name, emulator.serial);
    return emulator;
  }

  const defaultAvd = await getDefaultAVD(sdk, avds);
  const device = await runEmulator(sdk, defaultAvd, 5554); // TODO: will 5554 always be available at this point?
  debug('%s: emulator ready, running avd: %s on %s', selectDeviceByEmulator.name, defaultAvd.id, device.serial);

  return device;
}

export async function installApkToDevice(sdk: SDK, device: Device, apk: string, app: string): Promise<void> {
  process.stdout.write(`Installing ${apk}...\n`);

  try {
    await installApk(sdk, device, apk);
  } catch (e) {
    if (e instanceof ADBException) {
      if (e.code === ERR_INCOMPATIBLE_UPDATE) {
        process.stdout.write(`${e.message} Uninstalling and trying again...\n`);
        await uninstallApp(sdk, device, app);
        await installApk(sdk, device, apk);
        return;
      }
    }

    throw e;
  }
}
