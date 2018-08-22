import { resolve } from 'path';

import { getOptionValue } from '../utils/cli';
import { readdir, safeStat } from '../utils/fs';
import { execFile } from '../utils/process';

import { getConnectedDevicesUDIDs } from './list';

// TODO: add debug for more verbose info
// TODO: add udid to commands to specify a device
// TODO: check libimobiledevice tools for errors that return 0 but have "Error:" or "ERROR:"
// TODO: use errors.ts
// TODO: handle .ipa as well as .app paths

export async function run(args: string[]) {
  const { app /*id*/ } = await validateArgs(args);

  // Check if already mounted. If not, mount.
  if (!isDeveloperDiskImageMounted()) {
    // verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
    const version = await getIOSVersion();
    const xCodePath = await getXCodePath();
    const developerDiskImagePath = await getDeveloperDiskImagePath(version, xCodePath);
    if (!safeStat(developerDiskImagePath)) {
      throw new Error(`No Developer Disk Image found for SDK ${version} at\n${developerDiskImagePath}.`);
    }
    await mountDeveloperDiskImage(developerDiskImagePath);
  }
  await installAppOnDevice(app);
  const bundleId = await getBundleIdFromApp(app);
  await runAppOnDevice(bundleId);
  // Needed to connect to lldb to issue debug commands/stop app
  await startDebugServerProxy();
}

async function validateArgs(args: string[]) {
  const app = getOptionValue(args, '--app');
  if (!app) {
    throw new Error('--app argument is required.');
  }
  let id = getOptionValue(args, '--target'); // TODO: rename to target-id?
  if (!id) {
    const devices = await getConnectedDevicesUDIDs();
    if (!devices.length) {
      // TODO: should we just run on a simulator in this case?
      throw new Error('--target argument not provided and no connected devices found');
    }
    id = devices[0];
  }
  return { app, id };
}

async function isDeveloperDiskImageMounted() {
  try {
    const { stdout } = await execFile('ideviceimagemounter', ['-l'], { encoding: 'utf8' });
    return stdout && stdout.includes('ImageSignature');
  } catch (err) {
    throw new Error('Unable to check if Developer Disk Image is mounted on device.');
  }
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
    const versionDirs = await readdir(`${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/`);
    // Can look like "11.2 (15C107)"
    for (const dir of versionDirs) {
      if (dir.indexOf(version) !== -1) {
        return `${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/${dir}/DeveloperDiskImage.dmg`;
      }
    }
    throw new Error(`Unable to find Developer Disk Image path for SDK ${version}. Do you have the right version of Xcode?`);
  } catch {
    throw new Error(`Unable to find Developer Disk Image path for SDK ${version}.`);
  }
}

async function mountDeveloperDiskImage(developerDiskImagePath: string) {
  try {
    await execFile('ideviceimagemounter', [developerDiskImagePath], { encoding: 'utf8' });
  } catch (err) {
    throw new Error('Unable to mount Developer Disk Image on device.');
  }
}

async function getIOSVersion() {
  const { stdout } = await execFile('ideviceinfo', ['-k', 'ProductVersion'], { encoding: 'utf8' });
  if (!stdout) {
    throw new Error(`Unable to get SDK version of device.`);
  }
  const version = stdout.match(/\d+\.\d+/);
  if (!version) {
    throw new Error(`Unable to get SDK version of device.`);
  }
  return version[0];
}

// TODO: cross platform?
async function getBundleIdFromApp(appPath: string) {
  const plistPath = resolve(appPath, 'Info.plist');
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

async function installAppOnDevice(appPath: string) {
  try {
    await execFile('ideviceinstaller', ['-i', appPath], { encoding: 'utf8' });
  } catch (err) {
    throw new Error('Unable to install app on device.');
  }
}

async function runAppOnDevice(bundleId: string) {
  try {
    await execFile('idevicedebug', ['run', bundleId], { encoding: 'utf8' });
  } catch (err) {
    throw new Error('Unable to run app on device.');
  }
}

// TODO: find free port
async function startDebugServerProxy() {
  try {
    await execFile('idevicedebugserverproxy', ['9000'], { encoding: 'utf8' });
  } catch (err) {
    throw new Error('Unable to start debug server proxy.');
  }
}
