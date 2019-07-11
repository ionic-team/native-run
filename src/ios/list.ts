import { DeviceValues } from 'node-ioslib';

import { Exception } from '../errors';
import { Target, Targets, formatTargets } from '../utils/list';

import { getConnectedDevices } from './utils/device';
import { Simulator, getSimulators } from './utils/simulator';

export async function run(args: readonly string[]): Promise<void> {
  const targets = await list(args);
  process.stdout.write(`\n${formatTargets(args, targets)}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const errors: Exception<string>[] = [];
  const [ devices, virtualDevices ] = await Promise.all([
    (async () => {
      try {
        const devices = await getConnectedDevices();
        return devices.map(deviceToTarget);
      } catch (e) {
        errors.push(e);
        return [];
      }
    })(),
    (async () => {
      try {
        const simulators = await getSimulators();
        return simulators.map(simulatorToTarget);
      } catch (e) {
        errors.push(e);
        return [];
      }
    })(),
  ]);

  return { devices, virtualDevices, errors };
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
