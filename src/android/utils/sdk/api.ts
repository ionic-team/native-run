import * as Debug from 'debug';

import type * as Nexus_5X_API_24 from '../../data/avds/Nexus_5X_API_24.json';
import type * as Pixel_2_API_26 from '../../data/avds/Pixel_2_API_26.json';
import type * as Pixel_2_API_27 from '../../data/avds/Pixel_2_API_27.json';
import type * as Pixel_2_API_28 from '../../data/avds/Pixel_2_API_28.json';
import type * as Pixel_3_API_29 from '../../data/avds/Pixel_3_API_29.json';
import type * as Pixel_3_API_30 from '../../data/avds/Pixel_3_API_30.json';
import type * as Pixel_3_API_31 from '../../data/avds/Pixel_3_API_31.json';
import type * as Pixel_3_API_32 from '../../data/avds/Pixel_3_API_32.json';
import type * as Pixel_4_API_33 from '../../data/avds/Pixel_4_API_33.json';
import type * as Pixel_API_25 from '../../data/avds/Pixel_API_25.json';

import type { SDKPackage } from './';

const modulePrefix = 'native-run:android:utils:sdk:api';

export interface APILevel {
  readonly apiLevel: string;
  readonly packages: SDKPackage[];
  readonly missingPackages?: APISchemaPackage[];
}

export async function getAPILevels(
  packages: SDKPackage[],
): Promise<APILevel[]> {
  const debug = Debug(`${modulePrefix}:${getAPILevels.name}`);
  const levels = [
    ...new Set(
      packages
        .map(pkg => pkg.apiLevel)
        .filter(
          (apiLevel): apiLevel is string => typeof apiLevel !== 'undefined',
        ),
    ),
  ].sort((a, b) => (a <= b ? 1 : -1));

  const apis = levels.map(apiLevel => ({
    apiLevel,
    packages: packages.filter(pkg => pkg.apiLevel === apiLevel),
  }));

  debug(
    'Discovered installed API Levels: %O',
    apis.map(api => ({ ...api, packages: api.packages.map(pkg => pkg.path) })),
  );

  return apis;
}

export function findUnsatisfiedPackages(
  packages: readonly SDKPackage[],
  schemas: readonly APISchemaPackage[],
): APISchemaPackage[] {
  return schemas.filter(pkg => !findPackageBySchema(packages, pkg));
}

export function findPackageBySchema(
  packages: readonly SDKPackage[],
  pkg: APISchemaPackage,
): SDKPackage | undefined {
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

export function findPackageBySchemaPath(
  packages: readonly SDKPackage[],
  path: string | RegExp,
): SDKPackage | undefined {
  return packages.find(pkg => {
    if (typeof path !== 'string') {
      return !!pkg.path.match(path);
    }

    return path === pkg.path;
  });
}

export type PartialAVDSchematic =
  | typeof Pixel_4_API_33
  | typeof Pixel_3_API_32
  | typeof Pixel_3_API_31
  | typeof Pixel_3_API_30
  | typeof Pixel_3_API_29
  | typeof Pixel_2_API_28
  | typeof Pixel_2_API_27
  | typeof Pixel_2_API_26
  | typeof Pixel_API_25
  | typeof Nexus_5X_API_24;

export interface APISchemaPackage {
  readonly name: string;
  readonly path: string;
  readonly version: string | RegExp;
}

export interface APISchema {
  readonly apiLevel: string;
  readonly validate: (packages: readonly SDKPackage[]) => APISchemaPackage[];
  readonly loadPartialAVDSchematic: () => Promise<PartialAVDSchematic>;
}

export const API_LEVEL_33: APISchema = Object.freeze({
  apiLevel: '33',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 33',
        path: 'platforms;android-33',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-33;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-33;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_4_API_33.json'),
});

export const API_LEVEL_32: APISchema = Object.freeze({
  apiLevel: '32',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 32',
        path: 'platforms;android-32',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-32;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-32;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_3_API_32.json'),
});

export const API_LEVEL_31: APISchema = Object.freeze({
  apiLevel: '31',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 31',
        path: 'platforms;android-31',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-31;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-31;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_3_API_31.json'),
});

export const API_LEVEL_30: APISchema = Object.freeze({
  apiLevel: '30',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 30',
        path: 'platforms;android-30',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-30;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-30;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_3_API_30.json'),
});

export const API_LEVEL_29: APISchema = Object.freeze({
  apiLevel: '29',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 29',
        path: 'platforms;android-29',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-29;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-29;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_3_API_29.json'),
});

export const API_LEVEL_28: APISchema = Object.freeze({
  apiLevel: '28',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 28',
        path: 'platforms;android-28',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-28;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-28;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_2_API_28.json'),
});

export const API_LEVEL_27: APISchema = Object.freeze({
  apiLevel: '27',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 27',
        path: 'platforms;android-27',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-27;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-27;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_2_API_27.json'),
});

export const API_LEVEL_26: APISchema = Object.freeze({
  apiLevel: '26',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 26',
        path: 'platforms;android-26',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-26;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-26;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_2_API_26.json'),
});

export const API_LEVEL_25: APISchema = Object.freeze({
  apiLevel: '25',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 25',
        path: 'platforms;android-25',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-25;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-25;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Pixel_API_25.json'),
});

export const API_LEVEL_24: APISchema = Object.freeze({
  apiLevel: '24',
  validate: (packages: readonly SDKPackage[]) => {
    const schemas: APISchemaPackage[] = [
      { name: 'Android Emulator', path: 'emulator', version: /.+/ },
      {
        name: 'Android SDK Platform 24',
        path: 'platforms;android-24',
        version: /.+/,
      },
    ];

    const missingPackages = findUnsatisfiedPackages(packages, schemas);

    if (!findPackageBySchemaPath(packages, /^system-images;android-24;/)) {
      missingPackages.push({
        name: 'Google Play Intel x86 Atom System Image',
        path: 'system-images;android-24;google_apis_playstore;x86',
        version: '/.+/',
      });
    }

    return missingPackages;
  },
  loadPartialAVDSchematic: async () =>
    import('../../data/avds/Nexus_5X_API_24.json'),
});

export const API_LEVEL_SCHEMAS: readonly APISchema[] = [
  API_LEVEL_33,
  API_LEVEL_32,
  API_LEVEL_31,
  API_LEVEL_30,
  API_LEVEL_29,
  API_LEVEL_28,
  API_LEVEL_27,
  API_LEVEL_26,
  API_LEVEL_25,
  API_LEVEL_24,
];
