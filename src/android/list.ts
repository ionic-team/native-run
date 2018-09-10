import { Device, getDevices } from './utils/adb';
import { AVD, getDefaultAVD, getInstalledAVDs } from './utils/avd';
import { getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();

  const devices = (await getDevices(sdk))
    .filter(device => device.type === 'hardware')
    .map(device => deviceToTarget(device));

  const avds = await getInstalledAVDs(sdk);
  const defaultAvd = await getDefaultAVD(sdk, avds);

  if (!avds.includes(defaultAvd)) {
    avds.push(defaultAvd);
  }

  const virtualDevices = avds.map(avd => avdToTarget(avd));

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify({ devices, virtualDevices }));
    return;
  }

  process.stdout.write('Devices:\n\n');

  if (devices.length === 0) {
    process.stdout.write('  No connected devices found\n');
  } else {
    for (const device of devices) {
      process.stdout.write(`  ${formatTarget(device)}\n`);
    }
  }

  process.stdout.write('\nVirtual Devices:\n\n');

  if (virtualDevices.length === 0) {
    process.stdout.write('  No virtual devices found\n');
  } else {
    for (const avd of virtualDevices) {
      process.stdout.write(`  ${formatTarget(avd)}\n`);
    }
  }
}

interface Target {
  readonly model?: string;
  readonly name?: string;
  readonly sdkVersion: string;
  readonly id: string;
}

function deviceToTarget(device: Device): Target {
  return {
    model: `${device.manufacturer} ${device.model}`,
    sdkVersion: device.sdkVersion,
    id: device.serial,
  };
}

function avdToTarget(avd: AVD): Target {
  return {
    name: avd.name,
    sdkVersion: avd.sdkVersion,
    id: avd.id,
  };
}

function formatTarget(target: Target): string {
  return `
  ${target.name ? `${target.name} ` : ''}${target.model ? `${target.model} ` : ''}(API ${target.sdkVersion}) ${target.id}
  `.trim();
}
