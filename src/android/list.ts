import { serializeError } from '../errors';
import { Targets, formatTargets } from '../utils/list';

import { getDeviceTargets, getVirtualTargets } from './utils/list';
import { getSDK } from './utils/sdk';

export async function run(args: readonly string[]): Promise<void> {
  process.stdout.write(`\n${formatTargets(args, await list(args))}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const sdk = await getSDK();
  const [ devices, virtualDevices ] = await Promise.all([
    (async () => {
      try {
        return await getDeviceTargets(sdk);
      } catch (e) {
        process.stderr.write(`Error with Android device targets: ${serializeError(e)}`);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getVirtualTargets(sdk);
      } catch (e) {
        process.stderr.write(`Error with Android virtual targets: ${serializeError(e)}`);
        return [];
      }
    })(),
  ]);

  return { devices, virtualDevices };
}
