import * as Debug from 'debug';
import * as os from 'os';
import * as path from 'path';

import { isDir } from '../../utils/fs';

import { readProperties } from './properties';

const modulePrefix = 'native-run:android:utils:sdk';

const homedir = os.homedir();
// const SDK_DIRECTORIES = new Map<NodeJS.Platform, string[] | undefined>([
//   ['darwin', [path.join(homedir, 'Library', 'Android', 'sdk')]],
//   ['linux', [path.join(homedir, 'Android', 'sdk')]],
//   ['win32', [path.join('%LOCALAPPDATA%', 'Android', 'sdk')]],
// ]);

export interface SDK {
  readonly root: string; // $ANDROID_HOME/$ANDROID_SDK_ROOT
  readonly tools: {
    readonly path: string;
    readonly version: string;
  };
  readonly platformTools: {
    readonly path: string;
    readonly version: string;
  };
  readonly emulator: {
    readonly path: string; // $ANDROID_SDK_ROOT/emulator
    readonly version: string;
  };
  readonly avds: {
    readonly home: string; // $ANDROID_AVD_HOME
  };
}

export async function getSDK(): Promise<SDK> {
  const debug = Debug(`${modulePrefix}:${getSDK.name}`);
  const root = await resolveSDKRoot();

  // TODO: validate root and resolve source.properties

  const [
    toolsPath,
    platformToolsPath,
    emulatorPath,
    avdHome,
  ] = await Promise.all([
    resolveToolsPath(root),
    resolvePlatformToolsPath(root),
    resolveEmulatorPath(root),
    resolveAVDHome(root),
  ]);

  const [
    toolsVersion,
    platformToolsVersion,
    emulatorVersion,
  ] = await Promise.all([
    getAndroidPackageVersion(toolsPath),
    getAndroidPackageVersion(platformToolsPath),
    getAndroidPackageVersion(emulatorPath),
  ]);

  const sdk: SDK = {
    root,
    tools: {
      path: toolsPath,
      version: toolsVersion,
    },
    platformTools: {
      path: platformToolsPath,
      version: platformToolsVersion,
    },
    emulator: {
      path: emulatorPath,
      version: emulatorVersion,
    },
    avds: {
      home: avdHome,
    },
  };

  debug('SDK info:\n%O', sdk);

  return sdk;
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

  // TODO: No valid $ANDROID_SDK_ROOT, try searching common SDK directories.

  throw new Error(`No valid Android SDK root found.`);
}

export async function resolveToolsPath(root: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveToolsPath.name}`);
  const p = path.join(root, 'tools');

  debug('Looking at %s for tools path', p);

  if (await isDir(p)) {
    debug('Using %s', p);
    return p;
  }

  throw new Error(`No valid Android SDK Tools path found.`);
}

export async function resolvePlatformToolsPath(root: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolvePlatformToolsPath.name}`);
  const p = path.join(root, 'platform-tools');

  debug('Looking at %s for platform-tools path', p);

  if (await isDir(p)) {
    debug('Using %s', p);
    return p;
  }

  throw new Error(`No valid Android SDK Platform Tools path found.`);
}

export async function resolveEmulatorPath(root: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveEmulatorPath.name}`);
  // The emulator was separated out from tools as of 25.3.0 (March 2017)
  const paths = [path.join(root, 'emulator'), path.join(root, 'tools')];

  for (const p of paths) {
    debug('Looking at %s for emulator path', p);

    if (await isDir(p)) {
      debug('Using %s', p);
      return p;
    }
  }

  throw new Error(`No valid Android Emulator path found.`);
}

export interface AndroidPackage {
  'Pkg.Revision': string;
}

export const isAndroidPackage = (o: any): o is AndroidPackage => o && typeof o['Pkg.Revision'] === 'string';

export async function getAndroidPackageVersion(pkgPath: string): Promise<string> {
  const sourcePropsPath = path.resolve(pkgPath, 'source.properties');
  const sourceProps = await readProperties(sourcePropsPath, isAndroidPackage);

  if (!sourceProps) {
    throw new Error(`Invalid package file: ${sourcePropsPath}`);
  }

  return sourceProps['Pkg.Revision'];
}

export async function resolveAVDHome(root: string): Promise<string> {
  const debug = Debug(`${modulePrefix}:${resolveAVDHome.name}`);
  debug('Looking for $ANDROID_AVD_HOME');

  // Try $ANDROID_AVD_HOME
  if (process.env.ANDROID_AVD_HOME && await isDir(process.env.ANDROID_AVD_HOME)) {
    debug('Using $ANDROID_AVD_HOME at %s', process.env.$ANDROID_AVD_HOME);
    return process.env.ANDROID_AVD_HOME;
  }

  // Try $ANDROID_SDK_ROOT/.android/avd/ and then $HOME/.android/avd/
  const paths = [path.join(root, '.android', 'avd'), path.join(homedir, '.android', 'avd')];

  for (const p of paths) {
    debug('Looking at %s for AVD home', p);

    if (await isDir(p)) {
      debug('Using %s', p);
      return p;
    }
  }

  throw new Error(`No valid Android AVD root found.`);
}
