import { readDir, statSafe } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as fs from 'fs';
import { AFCError, AFC_STATUS, ClientManager, DebugserverClient, ResponseError } from 'node-libimobiledevice';
import * as path from 'path';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';
import { execFile } from '../utils/process';
import { wait } from '../utils/wait';

import { getConnectedDevicesUDIDs } from './list';

const debug = Debug('native-run:ios:run');

// TODO: handle .ipa as well as .app paths

export async function run(args: string[]) {
  const { app, udid } = await validateArgs(args);

  const clientManager = await ClientManager.create(udid);
  const imageMounter = await clientManager.getMobileImageMounterClient();

  // Check if already mounted. If not, mount.
  if (!(await imageMounter.lookupImage()).ImageSignature) {
    // verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
    // TODO: if windows/linux, download?
    const version = await (await clientManager.getLockdownClient()).getLockdownValue('ProductVersion');
    const xCodePath = await getXCodePath();
    const developerDiskImagePath = await getDeveloperDiskImagePath(version, xCodePath);
    const developerDiskImageSig = fs.readFileSync(`${developerDiskImagePath}.signature`);
    if (!statSafe(developerDiskImagePath)) {
      throw new Error(`No Developer Disk Image found for SDK ${version} at\n${developerDiskImagePath}.`);
    }
    await imageMounter.uploadImage(developerDiskImagePath, developerDiskImageSig);
    await imageMounter.mountImage(developerDiskImagePath, developerDiskImageSig);
  }
  const bundleId = await getBundleId(app);
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
  // TODO: support .ipa and .app, for now just .app
  // if (filename is a directory) -> .app
  const packageName = path.basename(app);
  const destPackagePath = path.join('PublicStaging', packageName);
  await afcClient.uploadDirectory(app, destPackagePath);

  const installer = await clientManager.getInstallationProxyClient();
  await installer.installApp(destPackagePath, bundleId);
  const { [bundleId]: appInfo } = await installer.lookupApp([bundleId]);
  let tries = 0;
  async function tryLaunch(): Promise<DebugserverClient> {
    const debugServerClient = await clientManager.getDebugserverClient();
    await debugServerClient.setMaxPacketSize(1024);
    await debugServerClient.setWorkingDir(appInfo.Container);
    await debugServerClient.launchApp(appInfo.Path, appInfo.CFBundleExecutable);

    try {
      await debugServerClient.checkLaunchSuccess();
    } catch (err) {
      if (err instanceof ResponseError) {
        debug(`There was an error launching app: ${err.response}`);
        if (err.response === 'EBusy') {
          debugServerClient.socket.end();
          debug('Trying again in .5s...');
          await wait(500);

          if (tries++ > 2) { return debugServerClient; }
          return tryLaunch();
        }
      } else {
        throw new RunException(`There was an error launching app: ${err}`);
      }
    }
    return debugServerClient;
  }
  await wait(200);
  const client = await tryLaunch();
  // don't await because it won't return
  client.continueApp();
  clientManager.end();
}

async function validateArgs(args: string[]) {
  const app = getOptionValue(args, '--app');
  if (!app) {
    throw new RunException('--app argument is required.');
  }
  let udid = getOptionValue(args, '--target'); // TODO: rename to target-id?
  if (!udid) {
    const devices = await getConnectedDevicesUDIDs();
    if (!devices.length) {
      // TODO: should we just run on a simulator in this case?
      throw new RunException('--target argument not provided and no connected devices found');
    }
    udid = devices[0];
  }
  return { app, udid };
}

async function getXCodePath() {
  try {
    const { stdout } = await execFile('xcode-select', ['-p'], { encoding: 'utf8' });
    if (!stdout) {
      throw new Error('Unable to get Xcode location. Is Xcode installed?');
    }
    return stdout.trim();
  } catch (err) {
    throw new Error('Unable to get Xcode location. Is Xcode installed?');
  }
}

async function getDeveloperDiskImagePath(version: string, xCodePath: string) {
  try {
    const versionDirs = await readDir(`${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/`);
    const versionPrefix = version.match(/\d+\.\d+/);
    if (versionPrefix === null) {
      throw new Error(`Invalid iOS version: ${version}`);
    }
    // Can look like "11.2 (15C107)"
    for (const dir of versionDirs) {
      if (dir.indexOf(versionPrefix[0]) !== -1) {
        return `${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/${dir}/DeveloperDiskImage.dmg`;
      }
    }
    throw new Error(`Unable to find Developer Disk Image path for SDK ${version}. Do you have the right version of Xcode?`);
  } catch {
    throw new Error(`Unable to find Developer Disk Image path for SDK ${version}.`);
  }
}

// TODO: cross platform?
// TODO: .ipa support
async function getBundleId(packagePath: string) {
  const plistPath = path.resolve(packagePath, 'Info.plist');
  try {
    const { stdout } = await execFile('/usr/libexec/PlistBuddy',
                                      ['-c', 'Print :CFBundleIdentifier', plistPath],
                                      { encoding: 'utf8' });
    if (!stdout) {
      throw new Error('Unable to get app bundle identifier');
    }
    return stdout.trim();
  } catch (err) {
    throw new Error('Unable to get app bundle identifier');
  }
}
