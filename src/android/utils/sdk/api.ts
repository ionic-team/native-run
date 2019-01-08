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

  debug('Discovered installed API Levels: %O', levels);

  return levels.map(level => ({
    level,
    packages: packages.filter(pkg => pkg.apiLevel === level),
  }));
}
