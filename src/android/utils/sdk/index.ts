import { mkdirp, readdirp } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as os from 'os';
import * as pathlib from 'path';

import {
  ERR_EMULATOR_HOME_NOT_FOUND,
  ERR_SDK_NOT_FOUND,
  ERR_SDK_PACKAGE_NOT_FOUND,
  SDKException,
} from '../../../errors';
import { isDir } from '../../../utils/fs';

import {
  getAPILevelFromPackageXml,
  getNameFromPackageXml,
  getPathFromPackageXml,
  getVersionFromPackageXml,
  readPackageXml,
} from './xml';

const modulePrefix = 'native-run:android:utils:sdk';

const homedir = os.homedir();
export const SDK_DIRECTORIES: ReadonlyMap<NodeJS.Platform, string[] | undefined> = new Map<
  NodeJS.Platform,
  string[] | undefined
>([
  ['darwin', [pathlib.join(homedir, 'Library', 'Android', 'sdk')]],
  ['linux', [pathlib.join(homedir, 'Android', 'sdk')]],
  ['win32', [pathlib.join(process.env.LOCALAPPDATA || pathlib.join(homedir, 'AppData', 'Local'), 'Android', 'Sdk')]],
]);

export interface SDK {
  readonly root: string;
  readonly emulatorHome: string;
  readonly avdHome: string;
  packages?: SDKPackage[];
}

export async function getSDK(): Promise<SDK> {
  const root = await resolveSDKRoot();
  const emulatorHome = await resolveEmulatorHome();
  const avdHome = await resolveAVDHome();

  return { root, emulatorHome, avdHome };
}

export interface SDKPackage {
  readonly path: string;
  readonly location: string;
  readonly version: string;
  readonly name: string;
  readonly apiLevel?: string;
}

const pkgcache = new Map<string, SDKPackage | undefined>();

export async function findAllSDKPackages(sdk: SDK): Promise<SDKPackage[]> {
  const debug = Debug(`${modulePrefix}:${findAllSDKPackages.name}`);

  if (sdk.packages) {
    return sdk.packages;
  }

  const sourcesRe = /^sources\/android-\d+\/.+\/.+/;
  debug('Walking %s to discover SDK packages', sdk.root);
  const contents = await readdirp(sdk.root, {
    filter: (item) => pathlib.basename(item.path) === 'package.xml',
    onError: (err) => debug('Error while walking SDK: %O', err),
    walkerOptions: {
      pathFilter: (p) => {
        if (
          [
            'bin',
            'bin64',
            'lib',
            'lib64',
            'include',
            'clang-include',
            'skins',
            'data',
            'examples',
            'resources',
            'systrace',
            'extras',
            // 'm2repository',
          ].includes(pathlib.basename(p))
        ) {
          return false;
        }

        if (p.match(sourcesRe)) {
          return false;
        }

        return true;
      },
    },
  });

  sdk.packages = await Promise.all(contents.map((p) => pathlib.dirname(p)).map((p) => getSDKPackage(p)));

  sdk.packages.sort((a, b) => (a.name >= b.name ? 1 : -1));

  return sdk.packages;
}

export async function getSDKPackage(location: string): Promise<SDKPackage> {
  const debug = Debug(`${modulePrefix}:${getSDKPackage.name}`);
  let pkg = pkgcache.get(location);

  if (!pkg) {
    const packageXmlPath = pathlib.join(location, 'package.xml');
    debug('Parsing %s', packageXmlPath);

    try {
      const packageXml = await readPackageXml(packageXmlPath);
      const name = getNameFromPackageXml(packageXml);
      const version = getVersionFromPackageXml(packageXml);
      const path = getPathFromPackageXml(packageXml);
      const apiLevel = getAPILevelFromPackageXml(packageXml);

      pkg = {
        path,
        location,
        version,
        name,
        apiLevel,
      };
    } catch (e) {
      debug('Encountered error with %s: %O', packageXmlPath, e);

      if (e.code === 'ENOENT') {
        throw new SDKException(`SDK package not found by location: ${location}.`, ERR_SDK_PACKAGE_NOT_FOUND);
      }

      throw e;
    }

    pkgcache.set(location, pkg);
  }

  return pkg;
}

export async function resolveSDKRoot(): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveSDKRoot.name}`);
  debug('Looking for $ANDROID_HOME');

  // $ANDROID_HOME is deprecated, but still overrides $ANDROID_SDK_ROOT if
  // defined and valid.
  if (process.env.ANDROID_HOME && (await isDir(process.env.ANDROID_HOME))) {
    debug('Using $ANDROID_HOME at %s', process.env.ANDROID_HOME);
    return process.env.ANDROID_HOME;
  }

  debug('Looking for $ANDROID_SDK_ROOT');

  // No valid $ANDROID_HOME, try $ANDROID_SDK_ROOT.
  if (process.env.ANDROID_SDK_ROOT && (await isDir(process.env.ANDROID_SDK_ROOT))) {
    debug('Using $ANDROID_SDK_ROOT at %s', process.env.ANDROID_SDK_ROOT);
    return process.env.ANDROID_SDK_ROOT;
  }

  const sdkDirs = SDK_DIRECTORIES.get(process.platform);

  if (!sdkDirs) {
    throw new SDKException(`Unsupported platform: ${process.platform}`);
  }

  debug('Looking at following directories: %O', sdkDirs);

  for (const sdkDir of sdkDirs) {
    if (await isDir(sdkDir)) {
      debug('Using %s', sdkDir);
      return sdkDir;
    }
  }

  throw new SDKException(`No valid Android SDK root found.`, ERR_SDK_NOT_FOUND);
}

export async function resolveEmulatorHome(): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveEmulatorHome.name}`);
  debug('Looking for $ANDROID_EMULATOR_HOME');

  if (process.env.ANDROID_EMULATOR_HOME && (await isDir(process.env.ANDROID_EMULATOR_HOME))) {
    debug('Using $ANDROID_EMULATOR_HOME at %s', process.env.ANDROID_EMULATOR_HOME);
    return process.env.ANDROID_EMULATOR_HOME;
  }

  debug('Looking at $HOME/.android');

  const homeEmulatorHome = pathlib.join(homedir, '.android');

  if (await isDir(homeEmulatorHome)) {
    debug('Using $HOME/.android/ at %s', homeEmulatorHome);
    return homeEmulatorHome;
  }

  throw new SDKException(`No valid Android Emulator home found.`, ERR_EMULATOR_HOME_NOT_FOUND);
}

export async function resolveAVDHome(): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveAVDHome.name}`);

  debug('Looking for $ANDROID_AVD_HOME');

  if (process.env.ANDROID_AVD_HOME && (await isDir(process.env.ANDROID_AVD_HOME))) {
    debug('Using $ANDROID_AVD_HOME at %s', process.env.ANDROID_AVD_HOME);
    return process.env.ANDROID_AVD_HOME;
  }

  debug('Looking at $HOME/.android/avd');

  const homeAvdHome = pathlib.join(homedir, '.android', 'avd');

  if (!(await isDir(homeAvdHome))) {
    debug('Creating directory: %s', homeAvdHome);
    await mkdirp(homeAvdHome);
  }

  debug('Using $HOME/.android/avd/ at %s', homeAvdHome);
  return homeAvdHome;
}

export function supplementProcessEnv(sdk: SDK): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ANDROID_SDK_ROOT: sdk.root,
    ANDROID_EMULATOR_HOME: sdk.emulatorHome,
    ANDROID_AVD_HOME: sdk.avdHome,
  };
}
