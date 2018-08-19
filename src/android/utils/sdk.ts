import * as Debug from 'debug';
import * as os from 'os';
import * as path from 'path';

import { isDir } from '../../utils/fs';

import { readProperties } from './properties';

const debug = Debug('native-run:android:utils:sdk');

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
  debug('%s: Looking for $ANDROID_HOME', resolveSDKRoot.name);

  // $ANDROID_HOME is deprecated, but still overrides $ANDROID_SDK_ROOT if
  // defined and valid.
  if (process.env.ANDROID_HOME && await isDir(process.env.ANDROID_HOME)) {
    debug('%s: Using $ANDROID_HOME at %s', resolveSDKRoot.name, process.env.ANDROID_HOME);
    return process.env.ANDROID_HOME;
  }

  debug('%s: Looking for $ANDROID_SDK_ROOT', resolveSDKRoot.name);

  // No valid $ANDROID_HOME, try $ANDROID_SDK_ROOT.
  if (process.env.ANDROID_SDK_ROOT && await isDir(process.env.ANDROID_SDK_ROOT)) {
    debug('%s: Using $ANDROID_SDK_ROOT at %s', resolveSDKRoot.name, process.env.ANDROID_SDK_ROOT);
    return process.env.ANDROID_SDK_ROOT;
  }

  // TODO: No valid $ANDROID_SDK_ROOT, try searching common SDK directories.

  throw new Error(`No valid Android SDK root found.`);
}

export async function resolveToolsPath(root: string): Promise<string> {
  const p = path.join(root, 'tools');

  debug('%s: Looking at %s for tools path', resolveToolsPath.name, p);

  if (await isDir(p)) {
    debug('%s: Using %s', resolveToolsPath.name, p);
    return p;
  }

  throw new Error(`No valid Android SDK Tools path found.`);
}

export async function resolvePlatformToolsPath(root: string): Promise<string> {
  const p = path.join(root, 'platform-tools');

  debug('%s: Looking at %s for platform-tools path', resolvePlatformToolsPath.name, p);

  if (await isDir(p)) {
    debug('%s: Using %s', resolvePlatformToolsPath.name, p);
    return p;
  }

  throw new Error(`No valid Android SDK Platform Tools path found.`);
}

export async function resolveEmulatorPath(root: string): Promise<string> {
  // The emulator was separated out from tools as of 25.3.0 (March 2017)
  const paths = [path.join(root, 'emulator'), path.join(root, 'tools')];

  for (const p of paths) {
    debug('%s: Looking at %s for emulator path', resolveEmulatorPath.name, p);

    if (await isDir(p)) {
      debug('%s: Using %s', resolveEmulatorPath.name, p);
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
  debug('%s: Looking for $ANDROID_AVD_HOME', resolveAVDHome.name);

  // Try $ANDROID_AVD_HOME
  if (process.env.ANDROID_AVD_HOME && await isDir(process.env.ANDROID_AVD_HOME)) {
    debug('%s: Using $ANDROID_AVD_HOME at %s', resolveAVDHome.name, process.env.$ANDROID_AVD_HOME);
    return process.env.ANDROID_AVD_HOME;
  }

  // Try $ANDROID_SDK_ROOT/.android/avd/ and then $HOME/.android/avd/
  const paths = [path.join(root, '.android', 'avd'), path.join(homedir, '.android', 'avd')];

  for (const p of paths) {
    debug('%s: Looking at %s for AVD home', resolveAVDHome.name, p);

    if (await isDir(p)) {
      debug('%s: Using %s', resolveAVDHome.name, p);
      return p;
    }
  }

  throw new Error(`No valid Android AVD root found.`);
}
