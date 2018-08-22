import * as Debug from 'debug';

import { ADBException, ERR_INCOMPATIBLE_UPDATE, RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { Device, getDevices, installApk, startActivity, uninstallApp, waitForBoot } from './utils/adb';
import { getAVDs, getDefaultAVD } from './utils/avd';
import { runEmulator } from './utils/emulator';
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

  // const devices2 = await getDevices(sdk);
  // console.log(devices2);
}

export async function selectDevice(sdk: SDK, args: string[]): Promise<Device> {
  const devices = await getDevices(sdk);
  const target = getOptionValue(args, '--target');
  const preferEmulator = args.includes('--emulator');

  if (target) {
    const device = devices.find(d => d.serial === target);

    if (!device) {
      throw new RunException(`--target ${target} is not a valid target device: device serial not found`);
    }

    return device;
  }

  if (!preferEmulator) {
    const hardwareDevices = devices.filter(d => d.type === 'hardware');

    // If a hardware device is found, we prefer launching to it instead of in an emulator.
    if (hardwareDevices.length > 0) {
      return hardwareDevices[0]; // TODO: can probably do better analysis on which to use?
    }
  }

  const emulatorDevices = devices.filter(d => d.type === 'emulator');

  if (emulatorDevices.length > 0) {
    return emulatorDevices[0];
  }

  const avds = await getAVDs(sdk);
  const defaultAvd = await getDefaultAVD(sdk, avds);
  const device = await runEmulator(sdk, defaultAvd, 5554); // TODO: will 5554 always be available?

  debug('emulator ready, running avd: %s on %s', defaultAvd.id, device.serial);
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
