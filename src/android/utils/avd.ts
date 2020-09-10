import { copy, mkdirp, readdir, statSafe } from '@ionic/utils-fs';
import * as Debug from 'debug';
import * as pathlib from 'path';

import { ASSETS_PATH } from '../../constants';
import { AVDException, ERR_INVALID_SKIN, ERR_INVALID_SYSTEM_IMAGE, ERR_MISSING_SYSTEM_IMAGE, ERR_SDK_UNSATISFIED_PACKAGES, ERR_UNSUITABLE_API_INSTALLATION, ERR_UNSUPPORTED_API_LEVEL } from '../../errors';
import { readINI, writeINI } from '../../utils/ini';
import { sort } from '../../utils/object';

import { SDK, SDKPackage, findAllSDKPackages } from './sdk';
import { APILevel, API_LEVEL_SCHEMAS, PartialAVDSchematic, findPackageBySchemaPath, getAPILevels } from './sdk/api';

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

export const isAVDINI = (o: any): o is AVDINI => o
  && typeof o['avd.ini.encoding'] === 'string'
  && typeof o['path'] === 'string'
  && typeof o['path.rel'] === 'string'
  && typeof o['target'] === 'string';

export const isAVDConfigINI = (o: any): o is AVDConfigINI => o
  && (typeof o['avd.ini.displayname'] === 'undefined' || typeof o['avd.ini.displayname'] === 'string')
  && (typeof o['hw.lcd.density'] === 'undefined' || typeof o['hw.lcd.density'] === 'string')
  && (typeof o['hw.lcd.height'] === 'undefined' || typeof o['hw.lcd.height'] === 'string')
  && (typeof o['hw.lcd.width'] === 'undefined' || typeof o['hw.lcd.width'] === 'string')
  && (typeof o['image.sysdir.1'] === 'undefined' || typeof o['image.sysdir.1'] === 'string');

export async function getAVDINIs(sdk: SDK): Promise<[string, AVDINI][]> {
  const debug = Debug(`${modulePrefix}:${getAVDINIs.name}`);

  const contents = await readdir(sdk.avdHome);

  const iniFilePaths = contents
    .filter(f => pathlib.extname(f) === '.ini')
    .map(f => pathlib.resolve(sdk.avdHome, f));

  debug('Discovered AVD ini files: %O', iniFilePaths);

  const iniFiles = await Promise.all(
    iniFilePaths.map(async (f): Promise<[string, AVDINI | undefined]> => [f, await readINI(f, isAVDINI)])
  );

  const avdInis = iniFiles
    .filter((c): c is [string, AVDINI] => typeof c[1] !== 'undefined');

  return avdInis;
}

export function getAVDFromConfigINI(inipath: string, ini: AVDINI, configini: AVDConfigINI): AVD {
  const inibasename = pathlib.basename(inipath);
  const id = inibasename.substring(0, inibasename.length - pathlib.extname(inibasename).length);
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
    sdkVersion: getSDKVersionFromTarget(ini.target),
    screenDPI,
    screenWidth,
    screenHeight,
  };
}

export function getSDKVersionFromTarget(target: string): string {
  return target.replace(/^android-(\d+)/, '$1');
}

export async function getAVDFromINI(inipath: string, ini: AVDINI): Promise<AVD | undefined> {
  const configini = await readINI(pathlib.resolve(ini.path, 'config.ini'), isAVDConfigINI);

  if (configini) {
    return getAVDFromConfigINI(inipath, ini, configini);
  }
}

export async function getInstalledAVDs(sdk: SDK): Promise<AVD[]> {
  const avdInis = await getAVDINIs(sdk);
  const possibleAvds = await Promise.all(avdInis.map(([inipath, ini]) => getAVDFromINI(inipath, ini)));
  const avds = possibleAvds.filter((avd): avd is AVD => typeof avd !== 'undefined');

  return avds;
}

export async function getDefaultAVDSchematic(sdk: SDK): Promise<AVDSchematic> {
  const debug = Debug(`${modulePrefix}:${getDefaultAVDSchematic.name}`);
  const packages = await findAllSDKPackages(sdk);
  const apis = await getAPILevels(packages);

  for (const api of apis) {
    try {
      const schematic = await getAVDSchematicFromAPILevel(sdk, packages, api);
      debug('Using schematic %s for default AVD', schematic.id);

      return schematic;
    } catch (e) {
      if (!(e instanceof AVDException)) {
        throw e;
      }

      debug('Issue with API %s: %s', api.apiLevel, e.message);
    }
  }

  throw new AVDException('No suitable API installation found.', ERR_UNSUITABLE_API_INSTALLATION, 1);
}

export async function getAVDSchematicFromAPILevel(sdk: SDK, packages: readonly SDKPackage[], api: APILevel): Promise<AVDSchematic> {
  const schema = API_LEVEL_SCHEMAS.find(s => s.apiLevel === api.apiLevel);

  if (!schema) {
    throw new AVDException(`Unsupported API level: ${api.apiLevel}`, ERR_UNSUPPORTED_API_LEVEL);
  }

  const missingPackages = schema.validate(packages);

  if (missingPackages.length > 0) {
    throw new AVDException(`Unsatisfied packages within API ${api.apiLevel}: ${missingPackages.map(pkg => pkg.path).join(', ')}`, ERR_SDK_UNSATISFIED_PACKAGES, 1);
  }

  return createAVDSchematic(sdk, await schema.loadPartialAVDSchematic());
}

export async function getDefaultAVD(sdk: SDK, avds: readonly AVD[]): Promise<AVD> {
  const defaultAvdSchematic = await getDefaultAVDSchematic(sdk);
  const defaultAvd = avds.find(avd => avd.id === defaultAvdSchematic.id);

  if (defaultAvd) {
    return defaultAvd;
  }

  return createAVD(sdk, defaultAvdSchematic);
}

export async function createAVD(sdk: SDK, schematic: AVDSchematic): Promise<AVD> {
  const { id, ini, configini } = schematic;

  await mkdirp(pathlib.join(sdk.avdHome, `${id}.avd`));

  await Promise.all([
    writeINI(pathlib.join(sdk.avdHome, `${id}.ini`), ini),
    writeINI(pathlib.join(sdk.avdHome, `${id}.avd`, 'config.ini'), configini),
  ]);

  return getAVDFromConfigINI(pathlib.join(sdk.avdHome, `${id}.ini`), ini, configini);
}

export async function createAVDSchematic(sdk: SDK, partialSchematic: PartialAVDSchematic): Promise<AVDSchematic> {
  const sysimage = findPackageBySchemaPath(sdk.packages || [], new RegExp(`^system-images;${partialSchematic.ini.target}`));

  if (!sysimage) {
    throw new AVDException(`Cannot create AVD schematic for ${partialSchematic.id}: missing system image.`, ERR_MISSING_SYSTEM_IMAGE);
  }

  const avdpath = pathlib.join(sdk.avdHome, `${partialSchematic.id}.avd`);
  const skinpath = getSkinPathByName(sdk, partialSchematic.configini['skin.name']);
  const sysdir = pathlib.relative(sdk.root, sysimage.location);
  const [ , , tagid ] = sysimage.path.split(';');

  const schematic: AVDSchematic = {
    id: partialSchematic.id,
    ini: sort({
      ...partialSchematic.ini,
      'path': avdpath,
      'path.rel': `avd/${partialSchematic.id}.avd`,
    }),
    configini: sort({
      ...partialSchematic.configini,
      'skin.path': skinpath,
      'image.sysdir.1': sysdir,
      'tag.id': tagid,
    }),
  };

  await validateAVDSchematic(sdk, schematic);

  return schematic;
}

export async function validateAVDSchematic(sdk: SDK, schematic: AVDSchematic): Promise<void> {
  const { configini } = schematic;
  const skin = configini['skin.name'];
  const skinpath = configini['skin.path'];
  const sysdir = configini['image.sysdir.1'];

  if (!skinpath) {
    throw new AVDException(`${schematic.id} does not have a skin defined.`, ERR_INVALID_SKIN);
  }

  if (!sysdir) {
    throw new AVDException(`${schematic.id} does not have a system image defined.`, ERR_INVALID_SYSTEM_IMAGE);
  }

  await validateSkin(sdk, skin, skinpath);
  await validateSystemImagePath(sdk, sysdir);
}

export async function validateSkin(sdk: SDK, skin: string, skinpath: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${validateSkin.name}`);
  const p = pathlib.join(skinpath, 'layout');

  debug('Checking skin layout file: %s', p);

  const stat = await statSafe(p);

  if (stat && stat.isFile()) {
    return;
  }

  await copySkin(sdk, skin, skinpath);
}

export async function copySkin(sdk: SDK, skin: string, skinpath: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${copySkin.name}`);
  const skinsrc = pathlib.resolve(ASSETS_PATH, 'android', 'skins', skin);

  const stat = await statSafe(skinsrc);

  if (stat && stat.isDirectory()) {
    debug('Copying skin from %s to %s', skinsrc, skinpath);

    try {
      return await copy(skinsrc, skinpath);
    } catch (e) {
      debug('Error while copying skin: %O', e);
    }
  }

  throw new AVDException(`${skinpath} is an invalid skin.`, ERR_INVALID_SKIN);
}

export async function validateSystemImagePath(sdk: SDK, sysdir: string): Promise<void> {
  const debug = Debug(`${modulePrefix}:${validateSystemImagePath.name}`);
  const p = pathlib.join(sdk.root, sysdir, 'package.xml');

  debug('Checking package.xml file: %s', p);

  const stat = await statSafe(p);

  if (!stat || !stat.isFile()) {
    throw new AVDException(`${p} is an invalid system image package.`, ERR_INVALID_SYSTEM_IMAGE);
  }
}

export function getSkinPathByName(sdk: SDK, name: string): string {
  const path = pathlib.join(sdk.root, 'skins', name);

  return path;
}
