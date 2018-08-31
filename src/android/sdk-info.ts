import { SDKPackage, findAllSDKPackages, getSDK } from './utils/sdk';

interface SDKInfo {
  root: string;
  packages: SDKPackage[];
}

export async function run(args: string[]) {
  const sdk = await getSDK();
  const packages = await findAllSDKPackages(sdk);

  const sdkinfo = {
    ...sdk,
    packages,
  };

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(sdkinfo));
    return;
  }

  process.stdout.write(`${formatSDKInfo(sdkinfo)}\n\n`);
}

function formatSDKInfo(sdk: SDKInfo): string {
  return `
SDK: ${sdk.root}
${sdk.packages.map(p => formatSDKPackage(p)).join('')}
  `.trim();
}

function formatSDKPackage(p: SDKPackage): string {
  return `
Name:     ${p.name}
Path:     ${p.path}
Version:  ${p.version}
Location: ${p.location}
`;
}
