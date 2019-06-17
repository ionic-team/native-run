import { DeviceValues } from 'node-ioslib';

import { serializeError } from '../errors';
import { Target, Targets, formatTargets } from '../utils/list';

import { getConnectedDevices } from './utils/device';
import { Simulator, getSimulators } from './utils/simulator';

export async function run(args: readonly string[]): Promise<void> {
  process.stdout.write(`\n${formatTargets(args, await list(args))}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const [ devices, virtualDevices ] = await Promise.all([
    (async () => {
      try {
        const devices = await getConnectedDevices();
        return devices.map(deviceToTarget);
      } catch (e) {
        process.stderr.write(`Error with iOS device targets: ${serializeError(e)}`);
        return [];
      }
    })(),
    (async () => {
      try {
        const simulators = await getSimulators();
        return simulators.map(simulatorToTarget);
      } catch (e) {
        process.stderr.write(`Error with iOS virtual targets: ${serializeError(e)}`);
        return [];
      }
    })(),
  ]);

  return { devices, virtualDevices };
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
