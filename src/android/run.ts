import * as Debug from 'debug';

import { getOptionValue } from '../utils/cli';

import { getAVDs } from './utils/avd';
import { ERR_UNKNOWN_AVD, runEmulator } from './utils/emulator';
import { getSDK } from './utils/sdk';

const debug = Debug('native-run:android:run');

export async function run(args: string[]) {
  const sdk = await getSDK();
  const avds = await getAVDs(sdk);

  if (avds.length === 0) {
    // TODO: create recommended avd automatically
    process.stderr.write(`\nError: No AVDs found within AVD home (${sdk.avds.home})\n`);
    process.exitCode = 1;
    return;
  }

  const avd = getOptionValue(args, '--avd', avds[0].id); // use recommended default

  // const devices = await getDevices(sdk);
  // console.log(devices);

  try {
    await runEmulator(sdk, avd);
    debug('emulator ready, running avd: %s', avd);
  } catch (e) {
    if (e.code === ERR_UNKNOWN_AVD) {
      process.stderr.write(`\n${e.toString()}\n`);
      process.exitCode = 1;
      return;
    }

    throw e;
  }

  // const devices2 = await getDevices(sdk);
  // console.log(devices2);
}
