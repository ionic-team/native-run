import { readDir, statSafe } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as fs from 'fs';
import { AFCError, AFC_STATUS, ClientManager } from 'node-libimobiledevice';
import * as path from 'path';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';
import { execFile } from '../utils/process';
import { wait } from '../utils/wait';

const debug = Debug('native-run:ios:run');

// TODO: handle .ipa as well as .app paths

export async function run(args: string[]) {
  const { app, udid } = await validateArgs(args);

  const clientManager = await ClientManager.create(udid);
  try {
    await mountDeveloperDiskImage(clientManager);

    const bundleId = await getBundleId(app);
    const packageName = path.basename(app);
    const destPackagePath = path.join('PublicStaging', packageName);

    await uploadApp(clientManager, app, destPackagePath);

    const installer = await clientManager.getInstallationProxyClient();
    await installer.installApp(destPackagePath, bundleId);

    const { [bundleId]: appInfo } = await installer.lookupApp([bundleId]);
    await wait(200); // launch fails with EBusy or ENotFound if you try to launch immediately after install
    await launchApp(clientManager, appInfo);
  } finally {
    clientManager.end();
  }

  async function mountDeveloperDiskImage(clientManager: ClientManager) {
    const imageMounter = await clientManager.getMobileImageMounterClient();
    // Check if already mounted. If not, mount.
    if (!(await imageMounter.lookupImage()).ImageSignature) {
      // verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
      // TODO: if windows/linux, download?
      const version = await (await clientManager.getLockdowndClient()).getValue('ProductVersion');
      const xCodePath = await getXCodePath();
      const developerDiskImagePath = await getDeveloperDiskImagePath(version, xCodePath);
      const developerDiskImageSig = fs.readFileSync(`${developerDiskImagePath}.signature`);
      if (!statSafe(developerDiskImagePath)) {
        throw new Error(`No Developer Disk Image found for SDK ${version} at\n${developerDiskImagePath}.`);
      }
      await imageMounter.uploadImage(developerDiskImagePath, developerDiskImageSig);
      await imageMounter.mountImage(developerDiskImagePath, developerDiskImageSig);
    }
  }

  async function uploadApp(clientManager: ClientManager, srcPath: string, destinationPath: string) {
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
    await afcClient.uploadDirectory(srcPath, destinationPath);
  }

  async function launchApp(clientManager: ClientManager, appInfo: any) {
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
        throw new RunException(`There was an error launching app: ${result}`);
      }
    }
    throw new RunException('Unable to launch app, number of tries exceeded');
  }
}

async function validateArgs(args: string[]) {
  const app = getOptionValue(args, '--app');
  if (!app) {
    throw new RunException('--app argument is required.');
  }
  const udid = getOptionValue(args, '--target'); // TODO: rename to target-id?
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

// TODO: cross platform? Use plist/bplist
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
