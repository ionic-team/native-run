import type { Exception } from '../errors';
import type { Targets } from '../utils/list';
import { formatTargets } from '../utils/list';

import { getDeviceTargets, getVirtualTargets } from './utils/list';
import { getSDK } from './utils/sdk';

export async function run(args: readonly string[]): Promise<void> {
  const targets = await list(args);
  process.stdout.write(`\n${formatTargets(args, targets)}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const sdk = await getSDK();
  const errors: Exception<string>[] = [];
  const [devices, virtualDevices] = await Promise.all([
    (async () => {
      try {
        return await getDeviceTargets(sdk);
      } catch (e: any) {
        errors.push(e);
        return [];
      }
    })(),
    (async () => {
      try {
        return await getVirtualTargets(sdk);
      } catch (e: any) {
        errors.push(e);
        return [];
      }
    })(),
  ]);

  return { devices, virtualDevices, errors };
}
