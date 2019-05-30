import { format } from '../utils/list';

import { getDeviceTargets, getVirtualTargets } from './utils/list';
import { getSDK } from './utils/sdk';

export async function run(args: ReadonlyArray<string>): Promise<void> {
  process.stdout.write(await list(args));
}

export async function list(args: ReadonlyArray<string>): Promise<string> {
  const sdk = await getSDK();
  const [ devices, virtualDevices ] = await Promise.all([
    getDeviceTargets(sdk),
    getVirtualTargets(sdk),
  ]);

  return format(args, devices, virtualDevices);
}
