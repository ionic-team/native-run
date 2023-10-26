import * as Debug from 'debug';

import type { SDKPackage } from './';

const modulePrefix = 'native-run:android:utils:sdk:api';

export interface APILevel {
  readonly apiLevel: string;
  readonly packages: SDKPackage[];
}

export async function getAPILevels(packages: SDKPackage[]): Promise<APILevel[]> {
  const debug = Debug(`${modulePrefix}:${getAPILevels.name}`);
  const levels = [
    ...new Set(
      packages.map((pkg) => pkg.apiLevel).filter((apiLevel): apiLevel is string => typeof apiLevel !== 'undefined'),
    ),
  ].sort((a, b) => (a <= b ? 1 : -1));

  const apis = levels.map((apiLevel) => ({
    apiLevel,
    packages: packages.filter((pkg) => pkg.apiLevel === apiLevel),
  }));

  debug(
    'Discovered installed API Levels: %O',
    apis.map((api) => ({ ...api, packages: api.packages.map((pkg) => pkg.path) })),
  );

  return apis;
}

export function findUnsatisfiedPackages(
  packages: readonly SDKPackage[],
  schemas: readonly APISchemaPackage[],
): APISchemaPackage[] {
  return schemas.filter((pkg) => !findPackageBySchema(packages, pkg));
}

export function findPackageBySchema(packages: readonly SDKPackage[], pkg: APISchemaPackage): SDKPackage | undefined {
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
  return packages.find((pkg) => {
    if (typeof path !== 'string') {
      return !!pkg.path.match(path);
    }

    return path === pkg.path;
  });
}

export interface APISchemaPackage {
  readonly name: string;
  readonly path: string;
  readonly version: string | RegExp;
}

export interface APISchema {
  readonly apiLevel: string;
  readonly validate: (packages: readonly SDKPackage[]) => APISchemaPackage[];
}
