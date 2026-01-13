import * as Debug from 'debug';

import {
  AVDException,
  AndroidRunException,
  CLIException,
  ERR_BAD_INPUT,
  ERR_NO_DEVICE,
  ERR_NO_TARGET,
  ERR_TARGET_NOT_FOUND,
  ERR_UNSUITABLE_API_INSTALLATION,
} from '../errors';
import { getOptionValue, getOptionValues } from '../utils/cli';
import { log } from '../utils/log';
import { onBeforeExit } from '../utils/process';

import type { Device, Ports } from './utils/adb';
import {
  closeApp,
  forwardPorts,
  getDevices,
  startActivity,
  unforwardPorts,
  waitForBoot,
  waitForClose,
} from './utils/adb';
import { getApkInfo } from './utils/apk';
import { getInstalledAVDs } from './utils/avd';
import { installApkToDevice, selectDeviceByTarget, selectHardwareDevice, selectVirtualDevice } from './utils/run';
import type { SDK } from './utils/sdk';
import { getSDK } from './utils/sdk';

const modulePrefix = 'native-run:android:run';

export async function run(args: readonly string[]): Promise<void> {
  const sdk = await getSDK();
  const apkPath = getOptionValue(args, '--app');
  const forwardedPorts = getOptionValues(args, '--forward');
  const timeout = Number.parseFloat(getOptionValue(args, '--timeout', '5000'));

  const ports: Ports[] = [];

  if (forwardedPorts && forwardedPorts.length > 0) {
    forwardedPorts.forEach((port: string) => {
      const [device, host] = port.split(':');

      if (!device || !host) {
        throw new CLIException(`Invalid --forward value "${port}": expecting <device port:host port>, e.g. 8080:8080`);
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
    await Promise.all(
      ports.map(async (port: Ports) => {
        await forwardPorts(sdk, device, port);
        log(`Forwarded device port ${port.device} to host port ${port.host}\n`);
      }),
    );
  }

  await installApkToDevice(sdk, device, apkPath, appId);

  log(`Starting application activity ${appId}/${activityName}...\n`);
  await startActivity(sdk, device, appId, activityName, timeout);

  log(`Run Successful\n`);

  onBeforeExit(async () => {
    if (ports) {
      await Promise.all(
        ports.map(async (port: Ports) => {
          await unforwardPorts(sdk, device, port);
        }),
      );
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

export async function selectDevice(sdk: SDK, args: readonly string[]): Promise<Device> {
  const debug = Debug(`${modulePrefix}:${selectDevice.name}`);

  const devices = await getDevices(sdk);
  const avds = await getInstalledAVDs(sdk);

  const target = getOptionValue(args, '--target');
  const preferEmulator = args.includes('--virtual');

  if (target) {
    const targetDevice = await selectDeviceByTarget(sdk, devices, avds, target);

    if (targetDevice) {
      return targetDevice;
    } else {
      throw new AndroidRunException(`Target not found: ${target}`, ERR_TARGET_NOT_FOUND);
    }
  }

  if (!preferEmulator) {
    const selectedDevice = await selectHardwareDevice(devices);

    if (selectedDevice) {
      return selectedDevice;
    } else if (args.includes('--device')) {
      throw new AndroidRunException(
        `No hardware devices found. Not attempting emulator because --device was specified.`,
        ERR_NO_DEVICE,
      );
    } else {
      log('No hardware devices found, attempting emulator...\n');
    }
  }

  try {
    return await selectVirtualDevice(sdk, devices, avds);
  } catch (e) {
    if (!(e instanceof AVDException)) {
      throw e;
    }

    debug('Issue with AVDs: %s', e.message);

    if (e.code === ERR_UNSUITABLE_API_INSTALLATION) {
      throw new AndroidRunException(
        'No targets devices/emulators available. Cannot create AVD because there is no suitable API installation. Use --sdk-info to reveal missing packages and other issues.',
        ERR_NO_TARGET,
      );
    }
  }

  throw new AndroidRunException('No target devices/emulators available.', ERR_NO_TARGET);
}
