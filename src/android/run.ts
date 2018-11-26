import { ERR_TARGET_NOT_FOUND, RunException } from '../errors';
import { getOptionValue } from '../utils/cli';
import { log } from '../utils/log';
import { onBeforeExit } from '../utils/process';

import { Device, closeApp, getDevices, startActivity, waitForBoot, waitForClose } from './utils/adb';
import { getApkInfo } from './utils/apk';
import { getInstalledAVDs } from './utils/avd';
import { installApkToDevice, selectDeviceByTarget, selectHardwareDevice, selectVirtualDevice } from './utils/run';
import { SDK, getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const apkPath = getOptionValue(args, '--app');

  if (!apkPath) {
    throw new RunException('--app is required');
  }

  const device = await selectDevice(sdk, args);

  log(`Selected ${device.type === 'hardware' ? 'hardware device' : 'emulator'} ${device.serial}\n`);

  const { appId, activityName } = await getApkInfo(apkPath);
  await waitForBoot(sdk, device);
  await installApkToDevice(sdk, device, apkPath, appId);

  log(`Starting application activity ${appId}/${activityName}...\n`);
  await startActivity(sdk, device, appId, activityName);

  log(`Run Successful\n`);

  if (args.includes('--connect')) {
    onBeforeExit(async () => {
      await closeApp(sdk, device, appId);
    });

    log(`Waiting for app to close...\n`);
    await waitForClose(sdk, device, appId);
  }
}

export async function selectDevice(sdk: SDK, args: string[]): Promise<Device> {
  const devices = await getDevices(sdk);
  const avds = await getInstalledAVDs(sdk);

  const target = getOptionValue(args, '--target');
  const preferEmulator = args.includes('--virtual');

  if (target) {
    const targetDevice = await selectDeviceByTarget(sdk, devices, avds, target);

    if (targetDevice) {
      return targetDevice;
    } else {
      throw new RunException(`Target not found: ${target}`, ERR_TARGET_NOT_FOUND);
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
