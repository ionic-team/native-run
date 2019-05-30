import { CLIException, ERR_BAD_INPUT, ERR_TARGET_NOT_FOUND, RunException } from '../errors';
import { getOptionValue, getOptionsValue } from '../utils/cli';
import { log } from '../utils/log';
import { onBeforeExit } from '../utils/process';

import { Device, Ports, closeApp, forwardPorts, getDevices, startActivity, unforwardPorts, waitForBoot, waitForClose } from './utils/adb';
import { getApkInfo } from './utils/apk';
import { getInstalledAVDs } from './utils/avd';
import { installApkToDevice, selectDeviceByTarget, selectHardwareDevice, selectVirtualDevice } from './utils/run';
import { SDK, getSDK } from './utils/sdk';

export async function run(args: ReadonlyArray<string>): Promise<void> {
  const sdk = await getSDK();
  const apkPath = getOptionValue(args, '--app');

  const forwardedPorts = getOptionsValue(args, '--forward');

  const ports: Ports[] = [];

  if (forwardedPorts && forwardedPorts.length > 0) {
    forwardedPorts.forEach((port: string) => {
    const [ device, host ] = port.split(':');

    if (!device || !host) {
      throw new CLIException('Invalid --forward value: expecting <device port:host port>, e.g. 8080:8080');
    }

    ports.push({ device, host });
    });
  }

  if (!apkPath) {
    throw new CLIException('--app is required', ERR_BAD_INPUT);
  }

  const device = await selectDevice(sdk, args);

  log(`Selected ${device.type === 'hardware' ? 'hardware device' : 'emulator'} ${device.serial}\n`);

  const { appId, activityName } = await getApkInfo(apkPath);
  await waitForBoot(sdk, device);

  if (ports) {
    ports.map(async (port: Ports) => {
      await forwardPorts(sdk, device, port);
      log(`Forwarded device port ${port.device} to host port ${port.host}\n`);

    });
  }

  await installApkToDevice(sdk, device, apkPath, appId);

  log(`Starting application activity ${appId}/${activityName}...\n`);
  await startActivity(sdk, device, appId, activityName);

  log(`Run Successful\n`);

  onBeforeExit(async () => {
    if (ports) {
    ports.map(async (port: Ports) => {
      await unforwardPorts(sdk, device, port);
    });
    }
  });

  if (args.includes('--connect')) {
    onBeforeExit(async () => {
      await closeApp(sdk, device, appId);
    });

    log(`Waiting for app to close...\n`);
    await waitForClose(sdk, device, appId);
  }
}

export async function selectDevice(sdk: SDK, args: ReadonlyArray<string>): Promise<Device> {
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
