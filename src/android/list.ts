import { list } from '../utils/list';

import { getDeviceTargets, getVirtualTargets } from './utils/list';
import { getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const [ devices, virtualDevices ] = await Promise.all([
    getDeviceTargets(sdk),
    getVirtualTargets(sdk),
  ]);

  return list(args, devices, virtualDevices);
}
