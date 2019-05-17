import * as Debug from 'debug';

import { SDKPackage } from './';

const modulePrefix = 'native-run:android:utils:sdk:api';

export interface APILevel {
  readonly apiLevel: string;
  readonly packages: SDKPackage[];
  readonly missingPackages?: APISchemaPackage[];
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

  const apis = levels.map(apiLevel => ({
    apiLevel,
    packages: packages.filter(pkg => pkg.apiLevel === apiLevel),
  }));

  debug('Discovered installed API Levels: %O', apis.map(api => ({ ...api, packages: api.packages.map(pkg => pkg.path) })));

  return apis;
}

export function findUnsatisfiedPackages(packages: ReadonlyArray<SDKPackage>, schema: APISchema): APISchemaPackage[] {
  return schema.packages.filter(pkg => !findPackageBySchema(packages, pkg));
}

export function findPackageBySchema(packages: ReadonlyArray<SDKPackage>, pkg: APISchemaPackage): SDKPackage | undefined {
  const apiPkg = findPackageBySchemaPath(packages, pkg.path);

  if (apiPkg) {
    if (typeof pkg.version === 'string') {
      if (pkg.version === apiPkg.version) {
        return apiPkg;
      }
    } else {
      if (apiPkg.version.match(pkg.version)) {
        return apiPkg;
      }
    }
  }
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
  readonly path: string;
  readonly version: string | RegExp;
}

export interface APISchema {
  readonly apiLevel: string;
  readonly packages: ReadonlyArray<APISchemaPackage>;
  readonly loadPartialAVDSchematic: () => Promise<PartialAVDSchematic>;
}

export const API_LEVEL_28: APISchema = Object.freeze({
  apiLevel: '28',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 28', path: 'platforms;android-28', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_28.json'),
});

export const API_LEVEL_27: APISchema = Object.freeze({
  apiLevel: '27',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 27', path: 'platforms;android-27', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_27.json'),
});

export const API_LEVEL_26: APISchema = Object.freeze({
  apiLevel: '26',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 26', path: 'platforms;android-26', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_2_API_26.json'),
});

export const API_LEVEL_25: APISchema = Object.freeze({
  apiLevel: '25',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 25', path: 'platforms;android-25', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Pixel_API_25.json'),
});

export const API_LEVEL_24: APISchema = Object.freeze({
  apiLevel: '24',
  packages: [
    { name: 'Android Emulator', path: 'emulator', version: /.+/ },
    { name: 'Android SDK Platform 24', path: 'platforms;android-24', version: /.+/ },
  ],
  loadPartialAVDSchematic: async () => import('../../data/avds/Nexus_5X_API_24.json'),
});

export const API_LEVEL_SCHEMAS: ReadonlyArray<APISchema> = [API_LEVEL_28, API_LEVEL_27, API_LEVEL_26, API_LEVEL_25, API_LEVEL_24];
