import * as Debug from 'debug';
import * as path from 'path';

import { readdir } from '../../utils/fs';
import { readINI } from '../../utils/ini';

import { SDK } from './sdk';

const debug = Debug('native-run:android:utils:avd');

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
  const contents = await readdir(sdk.avds.home);

  const iniFilePaths = contents
    .filter(f => path.extname(f) === '.ini')
    .map(f => path.resolve(sdk.avds.home, f));

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
