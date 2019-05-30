import { remove } from '@ionic/utils-fs';
import * as Debug from 'debug';
import { existsSync, mkdtempSync } from 'fs';
import * as path from 'path';

import { CLIException, ERR_BAD_INPUT, ERR_TARGET_NOT_FOUND, RunException } from '../errors';
import { getOptionValue } from '../utils/cli';

import { getBundleId, unzipIPA } from './utils/app';
import { getConnectedDevices, runOnDevice } from './utils/device';
import { getSimulators, runOnSimulator } from './utils/simulator';

const debug = Debug('native-run:ios:run');

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
    throw new RunException(`Path '${appPath}' not found`);
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
    if (udid) {
      if (devices.find(d => d.UniqueDeviceID === udid)) {
        await runOnDevice(udid, appPath, bundleId, waitForApp);
      } else if (simulators.find(s => s.udid === udid)) {
        await runOnSimulator(udid, appPath, bundleId, waitForApp);
      } else {
        throw new RunException(`No device or simulator with UDID "${udid}" found`, ERR_TARGET_NOT_FOUND);
      }
    } else if (devices.length && !preferSimulator) {
      // no udid, use first connected device
      await runOnDevice(devices[0].UniqueDeviceID, appPath, bundleId, waitForApp);
    } else {
      // use default sim
      await runOnSimulator(simulators[simulators.length - 1].udid, appPath, bundleId, waitForApp);
    }
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
