import * as Debug from 'debug';
import * as os from 'os';
import * as path from 'path';

import { isDir, readINI, readdir } from '../utils';

const debug = Debug('native-run:android:utils');

const homedir = os.homedir();
// const SDK_DIRECTORIES = new Map<NodeJS.Platform, string[] | undefined>([
//   ['darwin', [path.join(homedir, 'Library', 'Android', 'sdk')]],
//   ['linux', [path.join(homedir, 'Android', 'sdk')]],
//   ['win32', [path.join('%LOCALAPPDATA%', 'Android', 'sdk')]],
// ]);

export interface SDK {
  readonly root: string; // $ANDROID_HOME/$ANDROID_SDK_ROOT
  readonly avdHome: string; // $ANDROID_AVD_HOME
}

export async function getSDK(): Promise<SDK> {
  const root = await resolveSDKRoot();

  // TODO: validate root and resolve source.properties

  const avdHome = await resolveAVDHome(root);

  const sdk: SDK = { root, avdHome };

  debug('SDK info: %O', sdk);

  return sdk;
}

/**
 * @see https://developer.android.com/studio/command-line/variables
 */
export async function resolveSDKRoot(): Promise<string> {
  debug('Attempting to validate $ANDROID_HOME');

  // $ANDROID_HOME is deprecated, but still overrides $ANDROID_SDK_ROOT if
  // defined and valid.
  if (process.env.ANDROID_HOME && await isDir(process.env.ANDROID_HOME)) {
    debug('$ANDROID_HOME at %s is valid', process.env.ANDROID_HOME);
    return process.env.ANDROID_HOME;
  }

  debug('Attempting to validate $ANDROID_SDK_ROOT');

  // No valid $ANDROID_HOME, try $ANDROID_SDK_ROOT.
  if (process.env.ANDROID_SDK_ROOT && await isDir(process.env.ANDROID_SDK_ROOT)) {
    debug('$ANDROID_SDK_ROOT at %s is valid', process.env.ANDROID_SDK_ROOT);
    return process.env.ANDROID_SDK_ROOT;
  }

  // TODO: No valid $ANDROID_SDK_ROOT, try searching common SDK directories.

  throw new Error(`No valid Android SDK root found.`);
}

/**
 * @see https://developer.android.com/studio/command-line/variables
 */
export async function resolveAVDHome(root: string): Promise<string> {
  debug('Attempting to validate $ANDROID_AVD_HOME');

  // Try $ANDROID_AVD_HOME
  if (process.env.ANDROID_AVD_HOME && await isDir(process.env.ANDROID_AVD_HOME)) {
    debug('$ANDROID_AVD_HOME at %s is valid', process.env.$ANDROID_AVD_HOME);
    return process.env.ANDROID_AVD_HOME;
  }

  // Try $ANDROID_SDK_HOME/.android/avd/ and then $HOME/.android/avd/
  const paths = [path.join(root, '.android', 'avd'), path.join(homedir, '.android', 'avd')];

  for (const p of paths) {
    debug('Attempting to validate %s for AVD home', p);

    if (await isDir(p)) {
      debug('%s is valid for AVD home', p);
      return p;
    }
  }

  throw new Error(`No valid Android AVD root found.`);
}

export interface AVD {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly target: number;
  readonly screenDPI: number | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
}

export interface ConfigFile {
  readonly __filename: string;
}

export interface AVDINI extends ConfigFile {
  readonly path: string;
  readonly target: string;
}

export interface AVDConfigINI extends ConfigFile {
  readonly 'avd.ini.displayname'?: string;
  readonly 'hw.lcd.density'?: string;
  readonly 'hw.lcd.height'?: string;
  readonly 'hw.lcd.width'?: string;
}

export const isAVDINI = (o: any): o is AVDINI => o
  && typeof o.path === 'string'
  && typeof o.target === 'string';

export const isAVDConfigINI = (o: any): o is AVDConfigINI => o
  && (typeof o.AvdId === 'undefined' || typeof o.AvdId === 'string')
  && (typeof o['avd.ini.displayname'] === 'undefined' || typeof o['avd.ini.displayname'] === 'string')
  && (typeof o['hw.lcd.height'] === 'undefined' || typeof o['hw.lcd.height'] === 'string')
  && (typeof o['hw.lcd.width'] === 'undefined' || typeof o['hw.lcd.width'] === 'string');

export async function getAVDINIs(sdk: SDK): Promise<AVDINI[]> {
  const contents = await readdir(sdk.avdHome);

  const iniFilePaths = contents
    .filter(f => path.extname(f) === '.ini')
    .map(f => path.resolve(sdk.avdHome, f));

  debug('Discovered AVD ini files: %O', iniFilePaths);

  const iniFiles = await Promise.all(
    iniFilePaths.map(f => readINI(f, isAVDINI))
  );

  const avdInis = iniFiles
    .filter((c): c is AVDINI => typeof c !== 'undefined');

  return avdInis;
}

export function getAVDFromConfigINI(ini: AVDINI, configini: AVDConfigINI): AVD {
  const inibasename = path.basename(ini.__filename);
  const id = inibasename.substring(0, inibasename.length - path.extname(inibasename).length);
  const name = configini['avd.ini.displayname']
    ? String(configini['avd.ini.displayname'])
    : id.replace(/_/g, ' ');
  const screenDPI = configini['hw.lcd.density'] ? Number(configini['hw.lcd.density']) : null;
  const screenWidth = configini['hw.lcd.width'] ? Number(configini['hw.lcd.width']) : null;
  const screenHeight = configini['hw.lcd.height'] ? Number(configini['hw.lcd.height']) : null;

  return {
    id,
    path: ini.path,
    name,
    target: Number(ini.target.replace(/^android-(\d+)/, '$1')),
    screenDPI,
    screenWidth,
    screenHeight,
  };
}

export async function getAVDFromINI(ini: AVDINI): Promise<AVD | undefined> {
  const configini = await readINI(path.resolve(ini.path, 'config.ini'), isAVDConfigINI);

  if (configini) {
    return getAVDFromConfigINI(ini, configini);
  }
}

export async function getAVDs(sdk: SDK): Promise<AVD[]> {
  const avdInis = await getAVDINIs(sdk);
  const avds = await Promise.all(avdInis.map(ini => getAVDFromINI(ini)));

  return avds.filter((avd): avd is AVD => typeof avd !== 'undefined');
}
