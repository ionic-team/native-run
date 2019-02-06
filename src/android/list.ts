import { Target, list } from '../utils/list';

import { Device, getDevices } from './utils/adb';
import { AVD, getDefaultAVD, getInstalledAVDs } from './utils/avd';
import { SDK, getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const [ devices, virtualDevices ] = await Promise.all([
    getDeviceTargets(sdk),
    getVirtualTargets(sdk),
  ]);

  return list(args, devices, virtualDevices);
}

export async function getDeviceTargets(sdk: SDK) {
  return (await getDevices(sdk))
    .filter(device => device.type === 'hardware')
    .map(deviceToTarget);
}

export async function getVirtualTargets(sdk: SDK) {
  const avds = await getInstalledAVDs(sdk);
  const defaultAvd = await getDefaultAVD(sdk, avds);

  if (!avds.includes(defaultAvd)) {
    avds.push(defaultAvd);
  }

  return avds.map(avdToTarget);
}

function deviceToTarget(device: Device): Target {
  return {
    platform: 'android',
    model: `${device.manufacturer} ${device.model}`,
    sdkVersion: device.sdkVersion,
    id: device.serial,
    format() {
      return `${this.model} (API ${this.sdkVersion}) ${this.id}`;
    },
  };
}

function avdToTarget(avd: AVD): Target {
  return {
    platform: 'android',
    name: avd.name,
    sdkVersion: avd.sdkVersion,
    id: avd.id,
    format() {
      return `${this.name} (API ${this.sdkVersion}) ${this.id}`;
    },
  };
}
