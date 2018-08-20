import { AVD, getAVDs } from './utils/avd';
import { getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const avds = await getAVDs(sdk);

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(avds));
    return;
  }

  if (avds.length === 0) {
    process.stdout.write(`\nNo AVDs found within AVD home (${sdk.avds.home})\n`);
    return;
  }

  process.stdout.write(`\nFound ${avds.length} AVD${avds.length === 1 ? '' : 's'} within AVD home (${sdk.avds.home}):\n\n`);

  for (const avd of avds) {
    process.stdout.write(`${formatAVD(avd)}\n\n`);
  }
}

function formatAVD(avd: AVD): string {
  const dimensions = avd.screenWidth && avd.screenHeight
    ? `${avd.screenWidth}x${avd.screenHeight}`
    : `unknown dimensions`;

  return `
Name:\t${avd.name} (${avd.id})
Path:\t${avd.path}
Target:\tAPI ${avd.target}
Screen:\t${dimensions}${avd.screenDPI ? ` (${avd.screenDPI} dpi)` : ''}
  `.trim();
}
