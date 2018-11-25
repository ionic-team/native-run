import { mkdirp, readDir } from '@ionic/utils-fs';
import { spawnSync } from 'child_process';
import * as Debug from 'debug';
import { createWriteStream, mkdtempSync, readFileSync } from 'fs';
import { AFCError, AFC_STATUS, ClientManager, IPLookupResult } from 'node-ioslib';
import * as path from 'path';
import { promisify } from 'util';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';
import { execFile, onBeforeExit } from '../utils/process';
import { unzip } from '../utils/unzip';

import { getConnectedDevicesInfo, getSimulators } from './utils/device';

const debug = Debug('native-run:ios:run');
const wait = promisify(setTimeout);

export async function run(args: string[]) {
  let appPath = getOptionValue(args, '--app');
  if (!appPath) {
    throw new RunException('--app argument is required.');
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
      const appDir = await unzipApp(appPath, tempDir);
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

async function runOnSimulator(udid: string, appPath: string, bundleId: string, waitForApp: boolean) {
  debug(`Booting simulator ${udid}`);
  const bootResult = spawnSync('xcrun', ['simctl', 'boot', udid], { encoding: 'utf8' });
  // TODO: is there a better way to check this?
  if (bootResult.status && !bootResult.stderr.includes('Unable to boot device in current state: Booted')) {
    throw new Error(`There was an error booting simulator: ${bootResult.stderr}`);
  }

  debug(`Installing ${appPath} on ${udid}`);
  const installResult = spawnSync('xcrun', ['simctl', 'install', udid, appPath], { encoding: 'utf8' });
  if (installResult.status) {
    throw new Error(`There was an error installing app on simulator: ${installResult.stderr}`);
  }

  const xCodePath = await getXCodePath();
  debug(`Running simulator ${udid}`);
  const openResult = spawnSync('open', [`${xCodePath}/Applications/Simulator.app`, '--args', '-CurrentDeviceUDID', udid], { encoding: 'utf8' });
  if (openResult.status) {
    throw new Error(`There was an error opening simulator: ${openResult.stderr}`);
  }

  debug(`Launching ${appPath} on ${udid}`);
  const launchResult = spawnSync('xcrun', ['simctl', 'launch', udid, bundleId], { encoding: 'utf8' });
  if (launchResult.status) {
    throw new Error(`There was an error launching app on simulator: ${launchResult.stderr}`);
  }

  if (waitForApp) {
    onBeforeExit(async () => {
      const terminateResult = spawnSync('xcrun', ['simctl', 'terminate', udid, bundleId], { encoding: 'utf8' });
      if (terminateResult.status) {
        debug('Unable to terminate app on simulator');
      }
    });

    process.stdout.write(`Waiting for app to close...\n`);
    await waitForSimulatorClose(udid, bundleId);
  }
}

async function waitForSimulatorClose(udid: string, bundleId: string) {
  return new Promise<void>(resolve => {
    // poll service list for bundle id
    const interval = setInterval(async () => {
      try {
        const data = spawnSync('xcrun', ['simctl', 'spawn', udid, 'launchctl', 'list'], { encoding: 'utf8' });
        // if bundle id isn't in list, app isn't running
        if (data.stdout.indexOf(bundleId) === -1) {
          clearInterval(interval);
          resolve();
        }
      } catch (e) {
        debug('Error received from launchctl: %O', e);
        debug('App %s no longer found in process list for %s', bundleId, udid);
        clearInterval(interval);
        resolve();
      }
    }, 500);
  });
}

async function runOnDevice(udid: string, appPath: string, bundleId: string, waitForApp: boolean) {
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
    const version = await (await clientManager.getLockdowndClient()).getValue('ProductVersion');
    const developerDiskImagePath = await getDeveloperDiskImagePath(version);
    const developerDiskImageSig = readFileSync(`${developerDiskImagePath}.signature`);
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
  await afcClient.uploadDirectory(srcPath, destinationPath);
}

async function launchApp(clientManager: ClientManager, appInfo: IPLookupResult[string]) {
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

async function getXCodePath() {
  try {
    const { stdout } = await execFile('xcode-select', ['-p'], { encoding: 'utf8' });
    if (stdout) {
      return stdout.trim();
    }
  } catch { } // tslint:disable-line
  throw new Error('Unable to get Xcode location. Is Xcode installed?');
}

async function getDeveloperDiskImagePath(version: string) {
  const xCodePath = await getXCodePath();
  const versionDirs = await readDir(`${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/`);
  const versionPrefix = version.match(/\d+\.\d+/);
  if (versionPrefix === null) {
    throw new Error(`Invalid iOS version: ${version}`);
  }
  // Can look like "11.2 (15C107)"
  for (const dir of versionDirs) {
    if (dir.includes(versionPrefix[0])) {
      return `${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/${dir}/DeveloperDiskImage.dmg`;
    }
  }
  throw new Error(`Unable to find Developer Disk Image path for SDK ${version}. Do you have the right version of Xcode?`);
}

// TODO: cross platform? Use plist/bplist
async function getBundleId(packagePath: string) {
  const plistPath = path.resolve(packagePath, 'Info.plist');
  try {
    const { stdout } = await execFile('/usr/libexec/PlistBuddy',
                                      ['-c', 'Print :CFBundleIdentifier', plistPath],
                                      { encoding: 'utf8' });
    if (stdout) {
      return stdout.trim();
    }
  } catch { } // tslint:disable-line
  throw new Error('Unable to get app bundle identifier');
}

async function unzipApp(srcPath: string, destPath: string) {
  let error: Error | undefined;
  let appDir = '';

  await unzip(srcPath, async (entry, zipfile, openReadStream) => {
    debug(`Unzip: ${entry.fileName}`);
    const dest = path.join(destPath, entry.fileName);
    if (entry.fileName.endsWith('/')) {
      await mkdirp(dest);
      if (entry.fileName.endsWith('.app/')) {
        appDir = entry.fileName;
      }
      zipfile.readEntry();
    } else {
      await mkdirp(path.dirname(dest));
      const readStream = await openReadStream(entry);
      readStream.on('error', (err: Error) => error = err);
      readStream.on('end', () => { zipfile.readEntry(); });
      readStream.pipe(createWriteStream(dest));
    }
  });

  if (error) {
    throw error;
  }

  if (!appDir) {
    throw new Error('Unable to determine .app directory from .ipa');
  }
  return appDir;
}
