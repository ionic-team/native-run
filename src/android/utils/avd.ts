import { readdir } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as pathlib from 'path';

import { readINI } from '../../utils/ini';

import type { SDK } from './sdk';

const modulePrefix = 'native-run:android:utils:avd';

export interface AVD {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly sdkVersion: string;
  readonly screenDPI: number | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
}

export interface AVDSchematic {
  readonly id: string;
  readonly ini: Required<AVDINI>;
  readonly configini: Required<AVDConfigINI>;
}

export interface AVDINI {
  readonly 'avd.ini.encoding': string;
  readonly 'path': string;
  readonly 'path.rel': string;
  readonly 'target': string;
}

export interface AVDConfigINI {
  readonly 'AvdId'?: string;
  readonly 'abi.type'?: string;
  readonly 'avd.ini.displayname'?: string;
  readonly 'avd.ini.encoding'?: string;
  readonly 'hw.accelerometer'?: string;
  readonly 'hw.audioInput'?: string;
  readonly 'hw.battery'?: string;
  readonly 'hw.camera.back'?: string;
  readonly 'hw.camera.front'?: string;
  readonly 'hw.cpu.arch'?: string;
  readonly 'hw.cpu.ncore'?: string;
  readonly 'hw.device.hash2'?: string;
  readonly 'hw.device.manufacturer'?: string;
  readonly 'hw.device.name'?: string;
  readonly 'hw.gps'?: string;
  readonly 'hw.gpu.enabled'?: string;
  readonly 'hw.gpu.mode'?: string;
  readonly 'hw.initialOrientation'?: string;
  readonly 'hw.keyboard'?: string;
  readonly 'hw.lcd.density'?: string;
  readonly 'hw.lcd.height'?: string;
  readonly 'hw.lcd.width'?: string;
  readonly 'hw.ramSize'?: string;
  readonly 'hw.sdCard'?: string;
  readonly 'hw.sensors.orientation'?: string;
  readonly 'hw.sensors.proximity'?: string;
  readonly 'image.sysdir.1'?: string;
  readonly 'sdcard.size'?: string;
  readonly 'showDeviceFrame'?: string;
  readonly 'skin.dynamic'?: string;
  readonly 'skin.name'?: string;
  readonly 'skin.path'?: string;
  readonly 'tag.display'?: string;
  readonly 'tag.id'?: string;
}

export const isAVDINI = (o: any): o is AVDINI =>
  o &&
  typeof o['avd.ini.encoding'] === 'string' &&
  typeof o['path'] === 'string' &&
  typeof o['path.rel'] === 'string' &&
  typeof o['target'] === 'string';

export const isAVDConfigINI = (o: any): o is AVDConfigINI =>
  o &&
  (typeof o['avd.ini.displayname'] === 'undefined' ||
    typeof o['avd.ini.displayname'] === 'string') &&
  (typeof o['hw.lcd.density'] === 'undefined' ||
    typeof o['hw.lcd.density'] === 'string') &&
  (typeof o['hw.lcd.height'] === 'undefined' ||
    typeof o['hw.lcd.height'] === 'string') &&
  (typeof o['hw.lcd.width'] === 'undefined' ||
    typeof o['hw.lcd.width'] === 'string') &&
  (typeof o['image.sysdir.1'] === 'undefined' ||
    typeof o['image.sysdir.1'] === 'string');

export async function getAVDINIs(sdk: SDK): Promise<[string, AVDINI][]> {
  const debug = Debug(`${modulePrefix}:${getAVDINIs.name}`);

  const contents = await readdir(sdk.avdHome);

  const iniFilePaths = contents
    .filter(f => pathlib.extname(f) === '.ini')
    .map(f => pathlib.resolve(sdk.avdHome, f));

  debug('Discovered AVD ini files: %O', iniFilePaths);

  const iniFiles = await Promise.all(
    iniFilePaths.map(
      async (f): Promise<[string, AVDINI | undefined]> => [
        f,
        await readINI(f, isAVDINI),
      ],
    ),
  );

  const avdInis = iniFiles.filter(
    (c): c is [string, AVDINI] => typeof c[1] !== 'undefined',
  );

  return avdInis;
}

export function getAVDFromConfigINI(
  inipath: string,
  ini: AVDINI,
  configini: AVDConfigINI,
): AVD {
  const inibasename = pathlib.basename(inipath);
  const id = inibasename.substring(
    0,
    inibasename.length - pathlib.extname(inibasename).length,
  );
  const name = configini['avd.ini.displayname']
    ? String(configini['avd.ini.displayname'])
    : id.replace(/_/g, ' ');
  const screenDPI = configini['hw.lcd.density']
    ? Number(configini['hw.lcd.density'])
    : null;
  const screenWidth = configini['hw.lcd.width']
    ? Number(configini['hw.lcd.width'])
    : null;
  const screenHeight = configini['hw.lcd.height']
    ? Number(configini['hw.lcd.height'])
    : null;

  return {
    id,
    path: ini.path,
    name,
    sdkVersion: getSDKVersionFromTarget(ini.target),
    screenDPI,
    screenWidth,
    screenHeight,
  };
}

export function getSDKVersionFromTarget(target: string): string {
  return target.replace(/^android-(\d+)/, '$1');
}

export async function getAVDFromINI(
  inipath: string,
  ini: AVDINI,
): Promise<AVD | undefined> {
  const configini = await readINI(
    pathlib.resolve(ini.path, 'config.ini'),
    isAVDConfigINI,
  );

  if (configini) {
    return getAVDFromConfigINI(inipath, ini, configini);
  }
}

export async function getInstalledAVDs(sdk: SDK): Promise<AVD[]> {
  const avdInis = await getAVDINIs(sdk);
  const possibleAvds = await Promise.all(
    avdInis.map(([inipath, ini]) => getAVDFromINI(inipath, ini)),
  );
  const avds = possibleAvds.filter(
    (avd): avd is AVD => typeof avd !== 'undefined',
  );

  return avds;
}
