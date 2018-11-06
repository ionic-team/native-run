import { readDir, statSafe } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as fs from 'fs';
import { AFCError, AFC_STATUS, ClientManager } from 'node-ioslib';
import * as path from 'path';
import { Entry } from 'yauzl';

import { RunException } from '../errors';
import { getOptionValue } from '../utils/cli';
import { execFile } from '../utils/process';

const debug = Debug('native-run:ios:run');

export async function run(args: string[]) {
  const { app, udid } = await validateArgs(args);
  const clientManager = await ClientManager.create(udid);
  const isIPA = app.endsWith('.ipa');
  let appPath = app;

  try {
    await mountDeveloperDiskImage(clientManager);

    if (isIPA) {
      const { tmpdir } = await import('os');
      const tempDir = fs.mkdtempSync(`${tmpdir()}${path.sep}`);
      debug(`Unzipping .ipa to ${tempDir}`);
      const appDir = await unzipApp(appPath, tempDir);
      appPath = path.join(tempDir, appDir);
    }

    const bundleId = await getBundleId(appPath);
    const packageName = path.basename(appPath);
    const destPackagePath = path.join('PublicStaging', packageName);

    await uploadApp(clientManager, appPath, destPackagePath);

    const installer = await clientManager.getInstallationProxyClient();
    await installer.installApp(destPackagePath, bundleId);

    const { [bundleId]: appInfo } = await installer.lookupApp([bundleId]);
    await wait(200); // launch fails with EBusy or ENotFound if you try to launch immediately after install
    await launchApp(clientManager, appInfo);
  } finally {
    if (isIPA) {
      try {
        (await import('rimraf')).sync(appPath);
      } catch (err) {} // tslint:disable-line
    }
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
  const udid = getOptionValue(args, '--target');
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

async function wait(milliseconds: number) {
  return new Promise(r => setTimeout(r, milliseconds));
}

async function unzipApp(srcPath: string, destPath: string) {
  const [yauzl, mkdirp] = await Promise.all([
    await import('yauzl'),
    await import ('mkdirp'),
  ]);
  let appDir = '';
  return new Promise<string>((resolve, reject) => {
    yauzl.open(srcPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) { reject(err); }
      if (zipfile) {
        zipfile.on('error', err => reject(err));
        zipfile.on('end', () => {
          if (appDir) {
            resolve(appDir);
          } else {
            reject('Unable to determine .app directory from .ipa');
          }
        });
        zipfile.readEntry();
        zipfile.on('entry', (entry: Entry) => {
          debug(`Unzip: ${entry.fileName}`);
          const dest = path.join(destPath, entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            mkdirp(dest, err => {
              if (err) {
                reject(err);
              } else {
                if (entry.fileName.endsWith('.app/')) {
                  appDir = entry.fileName;
                }
                zipfile.readEntry();
              }
            });
          } else {
            mkdirp(path.dirname(dest), err => {
              if (err) { reject(err); }
              // file entry
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) { reject(err); }
                if (readStream) {
                  readStream.on('end', () => { zipfile.readEntry(); });
                  const writeStream = fs.createWriteStream(path.join(destPath, entry.fileName));
                  readStream.pipe(writeStream);
                }
              });
            });
          }
        });
      }
    });
  });
}
