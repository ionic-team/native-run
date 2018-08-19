import { Device, getDevices } from './utils/adb';
import { getSDK } from './utils/sdk';

export async function run(args: string[]) {
  const sdk = await getSDK();
  const devices = await getDevices(sdk);

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(devices));
    return;
  }

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
