import { IOSDevice, Simulator, getConnectedDevicesInfo, getSimulators } from './utils/device';

export async function run(args: string[]) {
  // TODO check for darwin?
  const simulators = await getSimulators();
  const devices = await getConnectedDevicesInfo();

  if (args.includes('--json')) {
    const result = { devices, simulators };
    process.stdout.write(JSON.stringify(result, undefined, 2) + '\n');
    return;
  }

  process.stdout.write('Devices:\n\n');
  if (devices.length === 0) {
    process.stdout.write('  No connected devices found\n');
  } else {
    for (const device of devices) {
      process.stdout.write(`  ${formatDevice(device)}\n`);
    }
  }

  process.stdout.write('\nSimulators:\n\n');

  for (const sim of simulators) {
    process.stdout.write(`  ${formatSimulator(sim)}\n`);
  }
}

function formatDevice(device: IOSDevice): string {
  return `
${device.name} ${device.model} (${device.sdkVersion}) ${device.id}
`.trim();
}

function formatSimulator(sim: Simulator): string {
  return `
${sim.name} (${sim.sdkVersion}) ${sim.id}
`.trim();
}
