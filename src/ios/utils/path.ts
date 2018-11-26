import { readDir } from '@ionic/utils-fs';

import { Exception } from '../../errors';
import { execFile } from '../../utils/process';

export async function getXCodePath() {
  try {
    const { stdout } = await execFile('xcode-select', ['-p'], { encoding: 'utf8' });
    if (stdout) {
      return stdout.trim();
    }
  } catch { } // tslint:disable-line
  throw new Exception('Unable to get Xcode location. Is Xcode installed?');
}

export async function getDeveloperDiskImagePath(version: string) {
  const xCodePath = await getXCodePath();
  const versionDirs = await readDir(`${xCodePath}/Platforms/iPhoneOS.platform/DeviceSupport/`);
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
  throw new Exception(`Unable to find Developer Disk Image path for SDK ${version}. Do you have the right version of Xcode?`);
}
