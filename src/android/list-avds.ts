import { AVD, getAVDs, getSDK } from './utils';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const avds = await getAVDs(sdk);

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(avds));
    return;
  }

  if (avds.length === 0) {
    process.stdout.write(`\nNo AVDs found within AVD home (${sdk.avdHome})\n`);
    return;
  }

  process.stdout.write(`\nDiscovered ${avds.length} AVD(s) within AVD home (${sdk.avdHome}):\n\n`);

  for (const avd of avds) {
    process.stdout.write(`${formatAVD(avd)}\n\n`);
  }
}

function formatAVD(avd: AVD): string {
  return `
Name:\t${avd.name} (${avd.id})
Path:\t${avd.path}
Target:\tAPI ${avd.target}
Screen:\t${avd.screenWidth}x${avd.screenHeight}
  `.trim();
}
