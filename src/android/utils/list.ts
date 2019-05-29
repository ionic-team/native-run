import * as Debug from 'debug';

import { Target } from '../../utils/list';

import { Device, getDevices } from './adb';
import { AVD, getDefaultAVD, getInstalledAVDs } from './avd';
import { SDK } from './sdk';

const modulePrefix = 'native-run:android:utils:list';

export async function getDeviceTargets(sdk: SDK): Promise<Target[]> {
  const debug = Debug(`${modulePrefix}:${getDeviceTargets.name}`);

  try {
    return (await getDevices(sdk))
      .filter(device => device.type === 'hardware')
      .map(deviceToTarget);
  } catch (e) {
    debug('Error getting device targets: %O', e);
  }

  return [];
}

export async function getVirtualTargets(sdk: SDK): Promise<Target[]> {
  const debug = Debug(`${modulePrefix}:${getVirtualTargets.name}`);

  try {
    const avds = await getInstalledAVDs(sdk);
    const defaultAvd = await getDefaultAVD(sdk, avds);

    if (!avds.includes(defaultAvd)) {
      avds.push(defaultAvd);
    }

    return avds.map(avdToTarget);
  } catch (e) {
    debug('Error getting virtual targets: %O', e);
  }

  return [];
}

export function deviceToTarget(device: Device): Target {
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

export function avdToTarget(avd: AVD): Target {
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
