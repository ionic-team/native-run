import { spawn } from 'child_process';

import { getOptionValue } from '../utils';

import { getAVDs, getSDK } from './utils';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const avds = await getAVDs(sdk);

  if (avds.length === 0) {
    // TODO: create recommended avd automatically
    process.stderr.write(`\nNo AVDs found within AVD home (${sdk.avdHome})\n`);
    process.exitCode = 1;
    return;
  }

  const avd = getOptionValue(args, '--avd', avds[0].id); // use recommended default

  // if (!avd) {
  //   process.stdout.write(`--avd not specified\n`); // TODO
  //   console.log(avds);
  // }

  const p = spawn('emulator', ['-avd', avd]); // TODO: use emulator bin from sdk info

  process.on('SIGINT', () => {
    p.kill('SIGTERM');
  });
}
