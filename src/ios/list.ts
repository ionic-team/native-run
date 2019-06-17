import * as Debug from 'debug';
import { DeviceValues } from 'node-ioslib';

import { Target, Targets, formatTargets } from '../utils/list';

import { getConnectedDevices } from './utils/device';
import { Simulator, getSimulators } from './utils/simulator';

const debug = Debug('native-run:ios:list');

export async function run(args: readonly string[]): Promise<void> {
  process.stdout.write(`\n${formatTargets(args, await list(args))}\n`);
}

export async function list(args: readonly string[]): Promise<Targets> {
  const devicesPromise = getConnectedDevices()
    .then(devices => devices.map(deviceToTarget))
    .catch(err => {
      debug('There was an error getting the iOS device list: %O', err);
      return [];
    });

  const simulatorsPromise = getSimulators()
    .then(simulators => simulators.map(simulatorToTarget))
    .catch(err => {
      debug('There was an error getting the iOS simulator list: %O', err);
      return [];
    });

  const [ devices, virtualDevices ] = await Promise.all([devicesPromise, simulatorsPromise]);

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
