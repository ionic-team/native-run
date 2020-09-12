import { stringify } from '../utils/json';

import type { SDKPackage } from './utils/sdk';
import { findAllSDKPackages, getSDK } from './utils/sdk';
import type { APILevel } from './utils/sdk/api';
import { API_LEVEL_SCHEMAS, getAPILevels } from './utils/sdk/api';

type Platform = Required<APILevel>;

interface SDKInfo {
  root: string;
  avdHome?: string;
  platforms: Platform[];
  tools: SDKPackage[];
}

export async function run(args: readonly string[]): Promise<void> {
  const sdk = await getSDK();
  const packages = await findAllSDKPackages(sdk);
  const apis = await getAPILevels(packages);
  const platforms = apis.map(api => {
    const schema = API_LEVEL_SCHEMAS.find(s => s.apiLevel === api.apiLevel);
    return { ...api, missingPackages: schema ? schema.validate(packages) : [] };
  });

  const sdkinfo: SDKInfo = {
    root: sdk.root,
    avdHome: sdk.avdHome,
    platforms,
    tools: packages.filter(pkg => typeof pkg.apiLevel === 'undefined'),
  };

  if (args.includes('--json')) {
    process.stdout.write(stringify(sdkinfo));
    return;
  }

  process.stdout.write(`${formatSDKInfo(sdkinfo)}\n\n`);
}

function formatSDKInfo(sdk: SDKInfo): string {
  return `
SDK Location:         ${sdk.root}
AVD Home${
    sdk.avdHome ? `:             ${sdk.avdHome}` : ` (!):         not found`
  }

${sdk.platforms.map(platform => `${formatPlatform(platform)}\n\n`).join('\n')}
Tools:

${sdk.tools.map(tool => formatPackage(tool)).join('\n')}
  `.trim();
}

function formatPlatform(platform: Platform): string {
  return `
API Level:            ${platform.apiLevel}
Packages:             ${platform.packages
    .map(p => formatPackage(p))
    .join('\n' + ' '.repeat(22))}
${
  platform.missingPackages.length > 0
    ? `(!) Missing Packages: ${platform.missingPackages
        .map(p => formatPackage(p))
        .join('\n' + ' '.repeat(22))}`
    : ''
}
  `.trim();
}

function formatPackage(p: {
  name: string;
  path: string;
  version?: string | RegExp;
}): string {
  return `${p.name}  ${p.path}  ${
    typeof p.version === 'string' ? p.version : ''
  }`;
}
