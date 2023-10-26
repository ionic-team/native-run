import type { Target } from '../../utils/list';

import type { Device } from './adb';
import { getDevices } from './adb';
import type { AVD } from './avd';
import { getInstalledAVDs } from './avd';
import type { SDK } from './sdk';

export async function getDeviceTargets(sdk: SDK): Promise<Target[]> {
  return (await getDevices(sdk)).filter((device) => device.type === 'hardware').map(deviceToTarget);
}

export async function getVirtualTargets(sdk: SDK): Promise<Target[]> {
  const avds = await getInstalledAVDs(sdk);
  return avds.map(avdToTarget);
}

export function deviceToTarget(device: Device): Target {
  return {
    platform: 'android',
    model: `${device.manufacturer} ${device.model}`,
    sdkVersion: device.sdkVersion,
    id: device.serial,
  };
}

export function avdToTarget(avd: AVD): Target {
  return {
    platform: 'android',
    name: avd.name,
    sdkVersion: avd.sdkVersion,
    id: avd.id,
  };
}
