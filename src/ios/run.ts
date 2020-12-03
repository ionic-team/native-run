import { remove } from '@ionic/utils-fs';
import * as Debug from 'debug';
import { existsSync, mkdtempSync } from 'fs';
import * as path from 'path';

import {
  CLIException,
  ERR_BAD_INPUT,
  ERR_TARGET_NOT_FOUND,
  IOSRunException,
} from '../errors';
import { getOptionValue } from '../utils/cli';
import { wait } from '../utils/process';

import type { DeviceValues } from './lib';
import { IOSLibError } from './lib/lib-errors';
import { getBundleId, unzipIPA } from './utils/app';
import { getConnectedDevices, runOnDevice } from './utils/device';
import type { SimulatorResult } from './utils/simulator';
import { getSimulators, runOnSimulator } from './utils/simulator';

const debug = Debug('native-run:ios:run');

interface IOSRunConfig {
  udid?: string;
  devices: DeviceValues[];
  simulators: SimulatorResult[];
  appPath: string;
  bundleId: string;
  waitForApp: boolean;
  preferSimulator: boolean;
}

async function runIpaOrAppFile({
  udid,
  devices,
  simulators,
  appPath,
  bundleId,
  waitForApp,
  preferSimulator,
}: IOSRunConfig): Promise<void> {
  if (udid) {
    if (devices.find(d => d.UniqueDeviceID === udid)) {
      await runOnDevice(udid, appPath, bundleId, waitForApp);
    } else if (simulators.find(s => s.udid === udid)) {
      await runOnSimulator(udid, appPath, bundleId, waitForApp);
    } else {
      throw new IOSRunException(
        `No device or simulator with UDID "${udid}" found`,
        ERR_TARGET_NOT_FOUND,
      );
    }
  } else if (devices.length && !preferSimulator) {
    // no udid, use first connected device
    await runOnDevice(devices[0].UniqueDeviceID, appPath, bundleId, waitForApp);
  } else {
    // use default sim
    await runOnSimulator(
      simulators[simulators.length - 1].udid,
      appPath,
      bundleId,
      waitForApp,
    );
  }
}

async function runIpaOrAppFileOnInterval(config: IOSRunConfig): Promise<void> {
  const retryInterval = 5000;
  let error: Error | undefined;

  const retry = async () => {
    process.stderr.write('Please unlock your device. Waiting 5 seconds...\n');
    await wait(retryInterval);
    await run();
  };

  const run = async () => {
    try {
      await runIpaOrAppFile(config);
    } catch (err) {
      if (err instanceof IOSLibError && err.code == 'DeviceLocked') {
        await retry();
      } else {
        error = err;
      }
    }
  };

  await run();

  if (error) {
    throw error;
  }
}

export async function run(args: readonly string[]): Promise<void> {
  let appPath = getOptionValue(args, '--app');
  if (!appPath) {
    throw new CLIException('--app is required', ERR_BAD_INPUT);
  }
  const udid = getOptionValue(args, '--target');
  const preferSimulator = args.includes('--virtual');
  const waitForApp = args.includes('--connect');
  const isIPA = appPath.endsWith('.ipa');

  if (!existsSync(appPath)) {
    throw new IOSRunException(`Path '${appPath}' not found`);
  }

  try {
    if (isIPA) {
      const { tmpdir } = await import('os');
      const tempDir = mkdtempSync(`${tmpdir()}${path.sep}`);
      debug(`Unzipping .ipa to ${tempDir}`);
      const appDir = await unzipIPA(appPath, tempDir);
      appPath = path.join(tempDir, appDir);
    }

    const bundleId = await getBundleId(appPath);

    const [devices, simulators] = await Promise.all([
      getConnectedDevices(),
      getSimulators(),
    ]);
    // try to run on device or simulator with udid
    const config: IOSRunConfig = {
      udid,
      devices,
      simulators,
      appPath,
      bundleId,
      waitForApp,
      preferSimulator,
    };

    await runIpaOrAppFileOnInterval(config);
  } finally {
    if (isIPA) {
      try {
        await remove(appPath);
      } catch {
        // ignore
      }
    }
  }
}
