import * as Debug from 'debug';
import * as os from 'os';
import * as pathlib from 'path';

import { ERR_AVD_HOME_NOT_FOUND, ERR_INVALID_SDK_PACKAGE, ERR_SDK_NOT_FOUND, ERR_SDK_PACKAGE_NOT_FOUND, SDKException } from '../../errors';
import { isDir, readFile, readdirr } from '../../utils/fs';

const modulePrefix = 'native-run:android:utils:sdk';

const homedir = os.homedir();
const SDK_DIRECTORIES = new Map<NodeJS.Platform, string[] | undefined>([
  ['darwin', [pathlib.join(homedir, 'Library', 'Android', 'sdk')]],
  ['linux', [pathlib.join(homedir, 'Android', 'sdk')]],
  ['win32', [pathlib.join('%LOCALAPPDATA%', 'Android', 'sdk')]],
]);

export interface SDK {
  readonly root: string;
  readonly avdHome: string;
}

export async function getSDK(): Promise<SDK> {
  const [ root, avdHome ] = await Promise.all([resolveSDKRoot(), resolveAVDHome()]);

  return { root, avdHome };
}

export interface SDKPackage {
  readonly path: string;
  readonly location: string;
  readonly version: string;
  readonly name: string;
}

const pkgcache = new Map<string, SDKPackage | undefined>();

export async function findAllSDKPackages(sdk: SDK): Promise<SDKPackage[]> {
  const sourcesRe = /^sources\/android-\d+\/.+/;
  const contents = await readdirr(sdk.root, {
    filter: item => pathlib.basename(item.path) === 'package.xml',
    walkerOptions: {
      pathFilter: p => {
        if ([
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
        ].includes(pathlib.basename(p))) {
          return false;
        }

        if (p.match(sourcesRe)) {
          return false;
        }

        return true;
      },
    },
  });

  const packages = await Promise.all(
    contents
      .map(p => pathlib.dirname(p))
      .map(p => getSDKPackage(p))
  );

  packages.sort((a, b) => a.name.localeCompare(b.name));

  return packages;
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

      pkg = {
        path,
        location,
        version,
        name,
      };
    } catch (e) {
      debug('Encountered error: %O', e);

      if (e.code === 'ENOENT') {
        throw new SDKException(`SDK package not found by location: ${location}.`, ERR_SDK_PACKAGE_NOT_FOUND);
      }

      throw e;
    }

    pkgcache.set(location, pkg);
  }

  return pkg;
}

export async function readPackageXml(path: string): Promise<import('elementtree').ElementTree> {
  const et = await import('elementtree');
  const contents = await readFile(path, 'utf8');
  const etree = et.parse(contents);

  return etree;
}

export function getPathFromPackageXml(packageXml: import('elementtree').ElementTree): string {
  const localPackage = packageXml.find('./localPackage');

  if (!localPackage) {
    throw new SDKException(`Invalid SDK package.`, ERR_INVALID_SDK_PACKAGE);
  }

  const path = localPackage.get('path');

  if (!path) {
    throw new SDKException(`Invalid SDK package path.`, ERR_INVALID_SDK_PACKAGE);
  }

  return path.toString();
}

export function getNameFromPackageXml(packageXml: import('elementtree').ElementTree): string {
  const name = packageXml.find('./localPackage/display-name');

  if (!name || !name.text) {
    throw new SDKException(`Invalid SDK package name.`, ERR_INVALID_SDK_PACKAGE);
  }

  return name.text.toString();
}

export function getVersionFromPackageXml(packageXml: import('elementtree').ElementTree): string {
  const versionElements = [
    packageXml.find('./localPackage/revision/major'),
    packageXml.find('./localPackage/revision/minor'),
    packageXml.find('./localPackage/revision/micro'),
  ];

  const textFromElement = (e: import('elementtree').Element | null): string => e && e.text ? e.text.toString() : '';
  const versions: string[] = [];

  for (const version of versionElements.map(textFromElement)) {
    if (!version) {
      break;
    }

    versions.push(version);
  }

  if (versions.length === 0) {
    throw new SDKException(`Invalid SDK package version.`, ERR_INVALID_SDK_PACKAGE);
  }

  return versions.join('.');
}

export async function resolveSDKRoot(): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveSDKRoot.name}`);
  debug('Looking for $ANDROID_HOME');

  // $ANDROID_HOME is deprecated, but still overrides $ANDROID_SDK_ROOT if
  // defined and valid.
  if (process.env.ANDROID_HOME && await isDir(process.env.ANDROID_HOME)) {
    debug('Using $ANDROID_HOME at %s', process.env.ANDROID_HOME);
    return process.env.ANDROID_HOME;
  }

  debug('Looking for $ANDROID_SDK_ROOT');

  // No valid $ANDROID_HOME, try $ANDROID_SDK_ROOT.
  if (process.env.ANDROID_SDK_ROOT && await isDir(process.env.ANDROID_SDK_ROOT)) {
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

export async function resolveAVDHome(): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveAVDHome.name}`);
  debug('Looking for $ANDROID_AVD_HOME');

  // Try $ANDROID_AVD_HOME
  if (process.env.ANDROID_AVD_HOME && await isDir(process.env.ANDROID_AVD_HOME)) {
    debug('Using $ANDROID_AVD_HOME at %s', process.env.$ANDROID_AVD_HOME);
    return process.env.ANDROID_AVD_HOME;
  }

  // Try $ANDROID_SDK_HOME/.android/avd/
  if (process.env.ANDROID_SDK_HOME) {
    const sdkHomeAvdHome = pathlib.join(process.env.ANDROID_SDK_HOME, '.android', 'avd');

    if (await isDir(sdkHomeAvdHome)) {
      debug('Using $ANDROID_SDK_HOME/.android/avd/ at %s', sdkHomeAvdHome);
      return sdkHomeAvdHome;
    }
  }

  // Try $HOME/.android/avd/
  const homeAvdHome = pathlib.join(homedir, '.android', 'avd');

  if (await isDir(homeAvdHome)) {
    debug('Using $HOME/.android/avd/ at %s', homeAvdHome);
    return homeAvdHome;
  }

  throw new SDKException(`No valid Android AVD home found.`, ERR_AVD_HOME_NOT_FOUND);
}
