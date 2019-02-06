import { DeviceValues } from 'node-ioslib';

import { Target, list } from '../utils/list';

import { getConnectedDevices } from './utils/device';
import { Simulator, getSimulators } from './utils/simulator';

export async function run(args: string[]) {
  // TODO check for darwin?
  const [ devices, simulators ] = await Promise.all([
    (await getConnectedDevices()).map(deviceToTarget),
    (await getSimulators()).map(simulatorToTarget),
  ]);

  return list(args, devices, simulators);
}

function deviceToTarget(device: DeviceValues): Target {
  return {
    platform: 'ios',
    name: device.DeviceName,
    model: device.ProductType,
    sdkVersion: device.ProductVersion,
    id: device.UniqueDeviceID,
    format() {
      return `${this.name} ${this.model} ${this.sdkVersion} ${this.id}`;
    },
  };
}

function simulatorToTarget(simulator: Simulator): Target {
  return {
    platform: 'ios',
    name: simulator.name,
    sdkVersion: simulator.runtime.version,
    id: simulator.udid,
    format() {
      return `${this.name} ${this.sdkVersion} ${this.id}`;
    },
  };
}
