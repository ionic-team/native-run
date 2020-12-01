import * as Debug from 'debug';
import { readFileSync } from 'fs';
import * as path from 'path';

import { Exception } from '../../errors';
import { onBeforeExit, wait } from '../../utils/process';
import type { DeviceValues, IPLookupResult } from '../lib';
import {
  AFCError,
  AFC_STATUS,
  ClientManager,
  LockdowndClient,
  UsbmuxdClient,
} from '../lib';

import { getDeveloperDiskImagePath } from './xcode';

const debug = Debug('native-run:ios:utils:device');

export async function getConnectedDevices() {
  const usbmuxClient = new UsbmuxdClient(UsbmuxdClient.connectUsbmuxdSocket());
  const usbmuxDevices = await usbmuxClient.getDevices();
  usbmuxClient.socket.end();

  return Promise.all(
    usbmuxDevices.map(
      async (d): Promise<DeviceValues> => {
        const socket = await new UsbmuxdClient(
          UsbmuxdClient.connectUsbmuxdSocket(),
        ).connect(d, 62078);
        const device = await new LockdowndClient(socket).getAllValues();
        socket.end();
        return device;
      },
    ),
  );
}

export async function runOnDevice(
  udid: string,
  appPath: string,
  bundleId: string,
  waitForApp: boolean,
) {
  const clientManager = await ClientManager.create(udid);

  try {
    await mountDeveloperDiskImage(clientManager);

    const packageName = path.basename(appPath);
    const destPackagePath = path.join('PublicStaging', packageName);

    await uploadApp(clientManager, appPath, destPackagePath);

    const installer = await clientManager.getInstallationProxyClient();
    await installer.installApp(destPackagePath, bundleId);

    const { [bundleId]: appInfo } = await installer.lookupApp([bundleId]);
    // launch fails with EBusy or ENotFound if you try to launch immediately after install
    await wait(200);
    const debugServerClient = await launchApp(clientManager, appInfo);
    if (waitForApp) {
      onBeforeExit(async () => {
        // causes continue() to return
        debugServerClient.halt();
        // give continue() time to return response
        await wait(64);
      });

      debug(`Waiting for app to close...\n`);
      const result = await debugServerClient.continue();
      // TODO: I have no idea what this packet means yet (successful close?)
      // if not a close (ie, most likely due to halt from onBeforeExit), then kill the app
      if (result !== 'W00') {
        await debugServerClient.kill();
      }
    }
  } finally {
    clientManager.end();
  }
}

async function mountDeveloperDiskImage(clientManager: ClientManager) {
  const imageMounter = await clientManager.getMobileImageMounterClient();
  // Check if already mounted. If not, mount.
  if (!(await imageMounter.lookupImage()).ImageSignature) {
    // verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
    // TODO: if windows/linux, download?
    const version = await (await clientManager.getLockdowndClient()).getValue(
      'ProductVersion',
    );
    const developerDiskImagePath = await getDeveloperDiskImagePath(version);
    const developerDiskImageSig = readFileSync(
      `${developerDiskImagePath}.signature`,
    );
    await imageMounter.uploadImage(
      developerDiskImagePath,
      developerDiskImageSig,
    );
    await imageMounter.mountImage(
      developerDiskImagePath,
      developerDiskImageSig,
    );
  }
}

async function uploadApp(
  clientManager: ClientManager,
  srcPath: string,
  destinationPath: string,
) {
  const afcClient = await clientManager.getAFCClient();
  try {
    await afcClient.getFileInfo('PublicStaging');
  } catch (err) {
    if (err instanceof AFCError && err.status === AFC_STATUS.OBJECT_NOT_FOUND) {
      await afcClient.makeDirectory('PublicStaging');
    } else {
      throw err;
    }
  }
  await afcClient.uploadDirectory(srcPath, destinationPath);
}

async function launchApp(
  clientManager: ClientManager,
  appInfo: IPLookupResult[string],
) {
  let tries = 0;
  while (tries < 3) {
    const debugServerClient = await clientManager.getDebugserverClient();
    await debugServerClient.setMaxPacketSize(1024);
    await debugServerClient.setWorkingDir(appInfo.Container);
    await debugServerClient.launchApp(appInfo.Path, appInfo.CFBundleExecutable);

    const result = await debugServerClient.checkLaunchSuccess();
    if (result === 'OK') {
      return debugServerClient;
    } else if (result === 'EBusy' || result === 'ENotFound') {
      debug('Device busy or app not found, trying to launch again in .5s...');
      tries++;
      debugServerClient.socket.end();
      await wait(500);
    } else {
      throw new Exception(`There was an error launching app: ${result}`);
    }
  }
  throw new Exception('Unable to launch app, number of tries exceeded');
}
