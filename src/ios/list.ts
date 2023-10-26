import type { Exception } from '../errors';
import type { Target, Targets } from '../utils/list';
import { formatTargets } from '../utils/list';

import type { DeviceValues } from './lib';
import { getConnectedDevices } from './utils/device';
import type { Simulator } from './utils/simulator';
import { getSimulators } from './utils/simulator';

export async function run(args: readonly string[]): Promise<void> {
  const targets = await list(args);
  process.stdout.write(`\n${formatTargets(args, targets)}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const errors: Exception<string>[] = [];
  const [devices, virtualDevices] = await Promise.all([
    (async () => {
      try {
        const devices = await getConnectedDevices();
        return devices.map(deviceToTarget);
      } catch (e: any) {
        errors.push(e);
        return [];
      }
    })(),
    (async () => {
      try {
        const simulators = await getSimulators();
        return simulators.map(simulatorToTarget);
      } catch (e: any) {
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
  };
}

function simulatorToTarget(simulator: Simulator): Target {
  return {
    platform: 'ios',
    name: simulator.name,
    sdkVersion: simulator.runtime.version,
    id: simulator.udid,
  };
}
