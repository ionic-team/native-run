import { formatAVD, getAVDs, getSDK } from './utils';

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

  process.stdout.write(`\nDiscovered ${avds.length} AVD(s) within AVD home (${sdk.avdHome}):\n`);

  for (const avd of avds) {
    process.stdout.write(`${formatAVD(avd)}`);
  }
}
