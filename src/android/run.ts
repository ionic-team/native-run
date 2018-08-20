import * as Debug from 'debug';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { Device, deployApk, getDevices, startActivity } from './utils/adb';
import { getAVDs } from './utils/avd';
import { runEmulator } from './utils/emulator';
import { SDK, getSDK } from './utils/sdk';

const debug = Debug('native-run:android:run');

export async function run(args: string[]) {
  const sdk = await getSDK();
  const apk = getOptionValue(args, '--apk');
  const target = getOptionValue(args, '--target');
  const activity = getOptionValue(args, '--activity', '.MainActivity');

  if (!apk) {
    throw new RunException('--apk is required');
  }

  if (!target) {
    throw new RunException('--target is required');
  }

  const device = await selectDevice(sdk, args);

  process.stdout.write(`Selected ${device.type === 'hardware' ? 'hardware device' : 'emulator'} ${device.serial}\n`);

  process.stdout.write(`Installing ${apk}...\n`);
  await deployApk(sdk, device.serial, apk);

  process.stdout.write(`Starting application activity ${target}/${activity}...\n`);
  await startActivity(sdk, device.serial, target, activity);

  process.stdout.write(`Run Successful\n`);

  // const devices2 = await getDevices(sdk);
  // console.log(devices2);
}

export async function selectDevice(sdk: SDK, args: string[]): Promise<Device> {
  const hardwareDevices = (await getDevices(sdk)).filter(device => device.type === 'hardware');

  if (hardwareDevices.length === 0) {
    const avds = await getAVDs(sdk);

    if (avds.length === 0) {
      // TODO: create recommended avd automatically
      throw new RunException(`Error: No AVDs found within AVD home (${sdk.avds.home})`);
    }

    const avd = getOptionValue(args, '--avd', avds[0].id); // use recommended default
    await runEmulator(sdk, avd);
    debug('emulator ready, running avd: %s', avd);
    const emulators = (await getDevices(sdk)).filter(device => device.type === 'emulator');
    return emulators[0]; // TODO: can probably do better analysis on which to use?
  } else {
    return hardwareDevices[0]; // TODO: can probably do better analysis on which to use?
  }
}
