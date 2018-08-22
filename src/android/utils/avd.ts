import * as Debug from 'debug';
import * as path from 'path';

import { mkdirp, readdir } from '../../utils/fs';
import { readINI, writeINI } from '../../utils/ini';

import { SDK } from './sdk';

const debug = Debug('native-run:android:utils:avd');

export interface AVD {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly sdkVersion: string;
  readonly screenDPI: number | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
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
  // readonly 'hw.device.hash2'?: string;
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
  readonly 'image.sysdir.1': string;
  readonly 'sdcard.size'?: string;
  readonly 'showDeviceFrame'?: string;
  readonly 'skin.dynamic'?: string;
  readonly 'skin.name'?: string;
  readonly 'skin.path'?: string;
  readonly 'tag.display'?: string;
  readonly 'tag.id'?: string;
}

export const isAVDINI = (o: any): o is AVDINI => o
  && typeof o['avd.ini.encoding'] === 'string'
  && typeof o['path'] === 'string'
  && typeof o['path.rel'] === 'string'
  && typeof o['target'] === 'string';

export const isAVDConfigINI = (o: any): o is AVDConfigINI => o
  && (typeof o.AvdId === 'undefined' || typeof o.AvdId === 'string')
  && (typeof o['avd.ini.displayname'] === 'undefined' || typeof o['avd.ini.displayname'] === 'string')
  && (typeof o['hw.lcd.height'] === 'undefined' || typeof o['hw.lcd.height'] === 'string')
  && (typeof o['hw.lcd.width'] === 'undefined' || typeof o['hw.lcd.width'] === 'string');

export async function getAVDINIs(sdk: SDK): Promise<[string, AVDINI][]> {
  const contents = await readdir(sdk.avds.home);

  const iniFilePaths = contents
    .filter(f => path.extname(f) === '.ini')
    .map(f => path.resolve(sdk.avds.home, f));

  debug('Discovered AVD ini files: %O', iniFilePaths);

  const iniFiles = await Promise.all(
    iniFilePaths.map(async (f): Promise<[string, AVDINI | undefined]> => [f, await readINI(f, isAVDINI)])
  );

  const avdInis = iniFiles
    .filter((c): c is [string, AVDINI] => typeof c[1] !== 'undefined');

  return avdInis;
}

export function getAVDFromConfigINI(inipath: string, ini: AVDINI, configini: AVDConfigINI): AVD {
  const inibasename = path.basename(inipath);
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
    sdkVersion: ini.target.replace(/^android-(\d+)/, '$1'),
    screenDPI,
    screenWidth,
    screenHeight,
  };
}

export async function getAVDFromINI(inipath: string, ini: AVDINI): Promise<AVD | undefined> {
  const configini = await readINI(path.resolve(ini.path, 'config.ini'), isAVDConfigINI);

  if (configini) {
    return getAVDFromConfigINI(inipath, ini, configini);
  }
}

export async function getAVDs(sdk: SDK): Promise<AVD[]> {
  const avdInis = await getAVDINIs(sdk);
  const possibleAvds = await Promise.all(avdInis.map(([inipath, ini]) => getAVDFromINI(inipath, ini)));
  const avds = possibleAvds.filter((avd): avd is AVD => typeof avd !== 'undefined');
  const defaultAvd = await getDefaultAVD(sdk, avds);

  if (!avds.includes(defaultAvd)) {
    avds.push(defaultAvd);
  }

  return avds;
}

const DEFAULT_AVD_ID = 'Pixel_2_API_28';

const DEFAULT_AVD_INI = {
  'avd.ini.encoding': 'UTF-8',
  'target': 'android-28',
  'path.rel': `avd/${DEFAULT_AVD_ID}.avd`,
};

const DEFAULT_AVD_CONFIG_INI = {
  'AvdId': DEFAULT_AVD_ID,
  'abi.type': 'x86',
  'avd.ini.displayname': 'Pixel 2 API 28',
  'avd.ini.encoding': 'UTF-8',
  'hw.accelerometer': 'yes',
  'hw.audioInput': 'yes',
  'hw.battery': 'yes',
  'hw.camera.back': 'virtualscene',
  'hw.camera.front': 'emulated',
  'hw.cpu.arch': 'x86',
  'hw.cpu.ncore': '4',
  // 'hw.device.hash2': 'MD5:bc5032b2a871da511332401af3ac6bb0',
  'hw.device.manufacturer': 'Google',
  'hw.device.name': 'pixel_2',
  'hw.gps': 'yes',
  'hw.gpu.enabled': 'yes',
  'hw.gpu.mode': 'auto',
  'hw.initialOrientation': 'Portrait',
  'hw.keyboard': 'yes',
  'hw.lcd.density': '420',
  'hw.lcd.height': '1920',
  'hw.lcd.width': '1080',
  'hw.ramSize': '1536',
  'hw.sdCard': 'yes',
  'hw.sensors.orientation': 'yes',
  'hw.sensors.proximity': 'yes',
  'image.sysdir.1': 'system-images/android-28/google_apis/x86/',
  'sdcard.size': '100M',
  'showDeviceFrame': 'yes',
  'skin.dynamic': 'yes',
  'skin.name': 'pixel_2',
  'tag.display': 'Google APIs',
  'tag.id': 'google_apis',
};

export function getDefaultAVDPath(sdk: SDK): string {
  return path.join(sdk.avds.home, `${DEFAULT_AVD_ID}.avd`);
}

export function getDefaultAVDINI(sdk: SDK): [string, Required<AVDINI>] {
  const avdpath = getDefaultAVDPath(sdk);

  return [
    path.join(sdk.avds.home, `${DEFAULT_AVD_ID}.ini`),
    {
      'path': avdpath,
      ...DEFAULT_AVD_INI,
    },
  ];
}

export function getDefaultAVDConfigINI(sdk: SDK): [string, Required<AVDConfigINI>] {
  const avdpath = getDefaultAVDPath(sdk);

  return [
    path.join(avdpath, 'config.ini'),
    {
      'skin.path': path.join(sdk.root, 'skins', 'pixel_2'),
      ...DEFAULT_AVD_CONFIG_INI,
    },
  ];
}

export async function getDefaultAVD(sdk: SDK, avds: ReadonlyArray<AVD>): Promise<AVD> {
  const defaultAvd = avds.find(avd => avd.id === DEFAULT_AVD_ID);

  if (defaultAvd) {
    return defaultAvd;
  }

  return createDefaultAVD(sdk);
}

export async function createDefaultAVD(sdk: SDK): Promise<AVD> {
  const [inipath, ini] = getDefaultAVDINI(sdk);
  const [configinipath, configini] = getDefaultAVDConfigINI(sdk);

  await mkdirp(path.dirname(configinipath));

  const writeConfigFile = async (p: string, f: { [key: string]: string; }) => {
    const ini = Object.keys(f).sort().reduce((acc, k) => {
      acc[k] = f[k];

      return acc;
    }, {} as { [key: string]: string; });

    await writeINI(p, ini);
  };

  await Promise.all([
    writeConfigFile(inipath, ini),
    writeConfigFile(configinipath, configini),
  ]);

  return getAVDFromConfigINI(inipath, ini, configini);
}
