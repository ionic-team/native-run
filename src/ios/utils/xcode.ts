import { readdir } from '@ionic/utils-fs';
import { spawnSync } from 'child_process';

import { Exception } from '../../errors';
import { execFile } from '../../utils/process';

type XcodeVersion = string;
type XcodeBuildVersion = string;

export function getXcodeVersionInfo(): readonly [XcodeVersion, XcodeBuildVersion] {
  const xcodeVersionInfo = spawnSync('xcodebuild', ['-version'], {
    encoding: 'utf8',
  });
  if (xcodeVersionInfo.error) {
    throw xcodeVersionInfo.error;
  }

  try {
    const trimmed = xcodeVersionInfo.stdout.trim().split('\n');
    return ['Xcode ', 'Build version'].map((s, i) => trimmed[i].replace(s, '')) as [string, string];
  } catch (error) {
    throw new Exception(`There was an error trying to retrieve the Xcode version: ${xcodeVersionInfo.stderr}`);
  }
}

export async function getXCodePath() {
  try {
    const { stdout } = await execFile('xcode-select', ['-p'], {
      encoding: 'utf8',
    });
    if (stdout) {
      return stdout.trim();
    }
  } catch {
    // ignore
  }
  throw new Exception('Unable to get Xcode location. Is Xcode installed?');
}

export async function getDeveloperDiskImagePath(version: string) {
  const xCodePath = await getXCodePath();
  const versionDirs = await readdir(`${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/`);
  const versionPrefix = version.match(/\d+\.\d+/);
  if (versionPrefix === null) {
    throw new Exception(`Invalid iOS version: ${version}`);
  }
  // Can look like "11.2 (15C107)"
  for (const dir of versionDirs) {
    if (dir.includes(versionPrefix[0])) {
      return `${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/${dir}/DeveloperDiskImage.dmg`;
    }
  }
  throw new Exception(
    `Unable to find Developer Disk Image path for SDK ${version}. Do you have the right version of Xcode?`,
  );
}
