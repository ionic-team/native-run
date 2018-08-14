import * as os from 'os';
import * as path from 'path';

import { RunOptions } from './definitions';
import { isDir } from './utils';

const homedir = os.homedir();
// const SDK_DIRECTORIES = new Map<NodeJS.Platform, string[] | undefined>([
//   ['darwin', [path.join(homedir, 'Library', 'Android', 'sdk')]],
//   ['linux', [path.join(homedir, 'Android', 'sdk')]],
//   ['win32', [path.join('%LOCALAPPDATA%', 'Android', 'sdk')]],
// ]);

export interface AndroidSDK {
  readonly root: string; // $ANDROID_HOME/$ANDROID_SDK_ROOT
  readonly avdHome: string; // $ANDROID_AVD_HOME
}

export async function getAndroidSDK(): Promise<AndroidSDK> {
  const root = await resolveAndroidSDKRoot();

  // TODO: validate root and resolve source.properties

  const avdHome = await resolveAndroidSDKAVDHome(root);

  return { root, avdHome };
}

/**
 * @see https://developer.android.com/studio/command-line/variables
 */
export async function resolveAndroidSDKRoot(): Promise<string> {
  // $ANDROID_HOME is deprecated, but still overrides $ANDROID_SDK_ROOT if
  // defined and valid.
  if (process.env.ANDROID_HOME && await isDir(process.env.ANDROID_HOME)) {
    return process.env.ANDROID_HOME;
  }

  // No valid $ANDROID_HOME, try $ANDROID_SDK_ROOT.
  if (process.env.ANDROID_SDK_ROOT && await isDir(process.env.ANDROID_SDK_ROOT)) {
    return process.env.ANDROID_SDK_ROOT;
  }

  // TODO: No valid $ANDROID_SDK_ROOT, try searching common SDK directories.

  throw new Error(`No valid Android SDK root found.`);
}

/**
 * @see https://developer.android.com/studio/command-line/variables
 */
export async function resolveAndroidSDKAVDHome(root: string): Promise<string> {
  // Try $ANDROID_AVD_HOME
  if (process.env.ANDROID_AVD_HOME && await isDir(process.env.ANDROID_AVD_HOME)) {
    return process.env.ANDROID_AVD_HOME;
  }

  // Try $ANDROID_SDK_HOME/.android/avd/ and then $HOME/.android/avd/
  const paths = [path.join(root, '.android', 'avd'), path.join(homedir, '.android', 'avd')];

  for (const p of paths) {
    if (await isDir(p)) {
      return p;
    }
  }

  throw new Error(`No valid Android AVD root found.`);
}

export async function getDevices() {
  // TODO: get android devices
}

export async function run(device: string, options: RunOptions) {
  // TODO: run android
}
