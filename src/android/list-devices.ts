import { Device, getDevices } from './utils/adb';
import { getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const devices = await getDevices(sdk);

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(devices));
    return;
  }

  if (devices.length === 0) {
    process.stdout.write(`No connected devices or emulators found\n`);
    return;
  }

  const emulators = devices.filter(device => device.type === 'emulator');
  const hardwares = devices.filter(device => device.type === 'hardware');

  process.stdout.write(`Found ${hardwares.length} connected device${hardwares.length === 1 ? '' : 's'} and ${emulators.length} emulator${emulators.length === 1 ? '' : 's'}:\n\n`);

  for (const device of devices) {
    process.stdout.write(`${formatDevice(device)}\n\n`);
  }
}

function formatDevice(device: Device): string {
  const properties = Object.keys(device.properties)
    .map(k => `    ${k}:${device.properties[k]}`)
    .join('\n');

  return `
Serial: ${device.serial} (${device.type})
State:  ${device.state}
Properties:
${properties}
  `.trim();
}
