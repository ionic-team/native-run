import * as Debug from 'debug';
import { mkdtempSync } from 'fs';
import * as path from 'path';

import { Exception } from '../errors';
import { getOptionValue } from '../utils/cli';

import { getBundleId, unzipIPA } from './utils/app';
import { getConnectedDevicesInfo, runOnDevice } from './utils/device';
import { getSimulators, runOnSimulator } from './utils/simulator';

const debug = Debug('native-run:ios:run');

export async function run(args: string[]) {
  let appPath = getOptionValue(args, '--app');
  if (!appPath) {
    throw new Exception('--app argument is required.');
  }
  const udid = getOptionValue(args, '--target');
  const preferSimulator = args.includes('--simulator') || args.includes('--emulator');
  const waitForApp = args.includes('--connect');
  const isIPA = appPath.endsWith('.ipa');
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
      getConnectedDevicesInfo(),
      getSimulators(),
    ]);
    // try to run on device or simulator with udid
    if (udid) {
      if (devices.find(d => d.id === udid)) {
        await runOnDevice(udid, appPath, bundleId, waitForApp);
      } else if (simulators.find(s => s.id === udid)) {
        await runOnSimulator(udid, appPath, bundleId, waitForApp);
      } else {
        throw new Error(`No device or simulator with udid ${udid} found`);
      }
    } else if (devices.length && !preferSimulator) {
      // no udid, use first connected device
      await runOnDevice(devices[0].id, appPath, bundleId, waitForApp);
    } else {
      // use default sim
      await runOnSimulator(simulators[simulators.length - 1].id, appPath, bundleId, waitForApp);
    }
  } finally {
    if (isIPA) {
      try { (await import('rimraf')).sync(appPath); } catch { } // tslint:disable-line
    }
  }
}
