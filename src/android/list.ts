import { Targets, formatTargets } from '../utils/list';

import { getDeviceTargets, getVirtualTargets } from './utils/list';
import { getSDK } from './utils/sdk';

export async function run(args: readonly string[]): Promise<void> {
  process.stdout.write(`\n${formatTargets(args, await list(args))}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const sdk = await getSDK();
  const [ devices, virtualDevices ] = await Promise.all([
    getDeviceTargets(sdk),
    getVirtualTargets(sdk),
  ]);

  return { devices, virtualDevices };
}
