import * as Debug from 'debug';

import { SDKPackage } from './';

const modulePrefix = 'native-run:android:utils:sdk:api';

export interface APILevel {
  readonly level: string;
  readonly packages: SDKPackage[];
}

export async function getAPILevels(packages: SDKPackage[]): Promise<APILevel[]> {
  const debug = Debug(`${modulePrefix}:${getAPILevels.name}`);
  const levels = [
    ...new Set(
      packages
        .map(pkg => pkg.apiLevel)
        .filter((apiLevel): apiLevel is string => typeof apiLevel !== 'undefined')
    ),
  ].sort((a, b) => a <= b ? 1 : -1);

  const apiLevels = levels.map(level => ({
    level,
    packages: packages.filter(pkg => pkg.apiLevel === level),
  }));

  debug('Discovered installed API Levels: %O', apiLevels.map(level => ({ ...level, packages: level.packages.map(pkg => pkg.path) })));

  return apiLevels;
}

export function findUnsatisfiedPackages(packages: ReadonlyArray<SDKPackage>, schema: APISchema): APISchemaPackage[] {
  return schema.packages.filter(schemaPkg => {
    const apiPkg = findPackageBySchemaPath(packages, schemaPkg.path);

    if (!apiPkg) {
      return true;
    }

    if (typeof schemaPkg.version !== 'string') {
      return !apiPkg.version.match(schemaPkg.version);
    }

    return schemaPkg.version !== apiPkg.version;
  });
}

export function findPackageBySchemaPath(packages: ReadonlyArray<SDKPackage>, path: string | RegExp): SDKPackage | undefined {
  return packages.find(pkg => {
    if (typeof path !== 'string') {
      return !!pkg.path.match(path);
    }

    return path === pkg.path;
  });
}

export type PartialAVDSchematic = (
  typeof import('../../data/avds/Pixel_2_API_28.json') |
  typeof import('../../data/avds/Pixel_2_API_27.json') |
  typeof import('../../data/avds/Pixel_2_API_26.json') |
  typeof import('../../data/avds/Pixel_API_25.json') |
  typeof import('../../data/avds/Nexus_5X_API_24.json')
);

export interface APISchemaPackage {
  readonly name: string;
  readonly path: string | RegExp;
  readonly version: string | RegExp;
}

export interface APISchema {
  readonly level: string;
  readonly packages: ReadonlyArray<APISchemaPackage>;
  readonly loadPartialAVDSchematic: () => Promise<PartialAVDSchematic>;
}

export const API_LEVEL_28: APISchema = Object.freeze({
  level: '28',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 28', path: /platforms;android-28/, version: /.+/ },
    { name: 'Google APIs Intel x86 Atom System Image', path: 'system-images;android-28;google_apis;x86', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_28.json'),
});

export const API_LEVEL_27: APISchema = Object.freeze({
  level: '27',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 27', path: 'platforms;android-27', version: /.+/ },
    { name: 'Google APIs Intel x86 Atom System Image', path: 'system-images;android-27;google_apis;x86', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_27.json'),
});

export const API_LEVEL_26: APISchema = Object.freeze({
  level: '26',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 26', path: 'platforms;android-26', version: /.+/ },
    { name: 'Google APIs Intel x86 Atom System Image', path: 'system-images;android-26;google_apis;x86', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_26.json'),
});

export const API_LEVEL_25: APISchema = Object.freeze({
  level: '25',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 25', path: 'platforms;android-25', version: /.+/ },
    { name: 'Google APIs Intel x86 Atom System Image', path: 'system-images;android-25;google_apis;x86', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_API_25.json'),
});

export const API_LEVEL_24: APISchema = Object.freeze({
  level: '24',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 24', path: 'platforms;android-24', version: /.+/ },
    { name: 'Google APIs Intel x86 Atom System Image', path: 'system-images;android-24;google_apis;x86', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Nexus_5X_API_24.json'),
});

export const API_LEVEL_SCHEMAS: ReadonlyArray<APISchema> = [API_LEVEL_28, API_LEVEL_27, API_LEVEL_26, API_LEVEL_25, API_LEVEL_24];
