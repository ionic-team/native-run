import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { Device, getDevices, startActivity, waitForBoot } from './utils/adb';
import { getAVDs } from './utils/avd';
import { installApkToDevice, selectDeviceByTarget, selectHardwareDevice, selectVirtualDevice } from './utils/run';
import { SDK, getSDK } from './utils/sdk';

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

  const target = getOptionValue(args, '--target');
  const preferEmulator = args.includes('--emulator');

  if (target) {
    const targetDevice = await selectDeviceByTarget(sdk, devices, avds, target);

    if (targetDevice) {
      return targetDevice;
    } else {
      throw new RunException(
        `Target not found: ${target}\n` +
        `Use --list to select a valid target`
      );
    }
  }

  if (!preferEmulator) {
    const selectedDevice = await selectHardwareDevice(devices);

    if (selectedDevice) {
      return selectedDevice;
    }
  }

  return selectVirtualDevice(sdk, devices, avds);
}
