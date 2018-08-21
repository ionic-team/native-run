import * as Debug from 'debug';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { Device, deployApk, getDevices, startActivity } from './utils/adb';
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

  process.stdout.write(`Installing ${apk}...\n`);
  await deployApk(sdk, device.serial, apk);

  process.stdout.write(`Starting application activity ${app}/${activity}...\n`);
  await startActivity(sdk, device.serial, app, activity);

  process.stdout.write(`Run Successful\n`);

  // const devices2 = await getDevices(sdk);
  // console.log(devices2);
}

export async function selectDevice(sdk: SDK, args: string[]): Promise<Device> {
  const devices = await getDevices(sdk);
  const target = getOptionValue(args, '--target');

  if (target) {
    const device = devices.find(d => d.serial === target);

    if (!device) {
      throw new RunException(`--target ${target} is not a valid target device: device serial not found`);
    }

    return device;
  }

  const hardwareDevices = devices.filter(d => d.type === 'hardware');

  // If a hardware device is found, we prefer launching to it instead of in an emulator.
  if (hardwareDevices.length > 0) {
    return hardwareDevices[0]; // TODO: can probably do better analysis on which to use?
  }

  const avds = await getAVDs(sdk);
  const defaultAvd = await getDefaultAVD(sdk, avds);
  await runEmulator(sdk, defaultAvd);
  debug('emulator ready, running avd: %s', target);
  const emulators = (await getDevices(sdk)).filter(d => d.type === 'emulator');
  return emulators[0]; // TODO: can probably do better analysis on which to use?
}
