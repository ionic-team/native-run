import { spawnSync } from 'child_process'; // TODO: need cross-spawn for windows?
import { LockdowndClient, UsbmuxdClient } from 'node-libimobiledevice';

export type UDID = string;
export interface IOSDevice {
  readonly name: string;
  readonly model: string; // TODO: map to actual model (ie. iPhone8,4 -> iPhone SE)
  readonly sdkVersion: string;
  readonly id: string;
}
export interface Simulator {
  readonly name: string;
  readonly sdkVersion: string;
  readonly id: string;
}

interface SimCtlOutput {
  devices: SimCtlDeviceDict;
  runtimes: SimCtlRuntime[];
  devicetypes: SimCtlDeviceType[];
}

interface SimCtlDeviceType {
  name: string;  // "iPhone 7"
  identifier: string; // "com.apple.CoreSimulator.SimDeviceType.iPhone-7"
}

interface SimCtlDevice {
  availability: '(available)' | '(unavailable)';
  name: string; // "iPhone 5";
  state: string; // "Shutdown"
  udid: string;
}

interface SimCtlDeviceDict {
  readonly [key: string]: SimCtlDevice[];
}

interface SimCtlRuntime {
  readonly buildversion: string; // "14B72"
  readonly availability: '(available)' | '(unavailable)';
  readonly name: string; // "iOS 10.1"
  readonly identifier: string; // "com.apple.CoreSimulator.SimRuntime.iOS-10-1"
  readonly version: string; // "10.1"
}

export async function getSimulators(): Promise<Simulator[]> {
    const simctl = spawnSync('xcrun', ['simctl', 'list', '--json'], { encoding: 'utf8' });
    const output: SimCtlOutput = JSON.parse(simctl.stdout);
    return output.runtimes
      .filter(runtime => runtime.name.indexOf('watch') === -1 && runtime.name.indexOf('tv') === -1)
      .map(runtime => output.devices[runtime.name]
        .filter(device => device.availability.indexOf('unavailable') === -1)
        .map(device => ({
          name: device.name,
          sdkVersion: runtime.version,
          id: device.udid,
        }))
      )
      .reduce((prev, next) => prev.concat(next)) // flatten array of runtime devices arrays
      .sort((a, b) => a.name < b.name ? -1 : 1);
}

export async function getConnectedDevicesInfo(): Promise<IOSDevice[]> {
  const usbmuxClient = new UsbmuxdClient(UsbmuxdClient.connectUsbmuxdSocket());
  const devices = await usbmuxClient.getDevices();
  const lockdownSockets = await Promise.all(devices.map(device => usbmuxClient.connect(device, 62078)));
  const deviceInfos = await Promise.all(lockdownSockets.map(socket => new LockdowndClient(socket).getAllValues()));
  // close sockets
  for (const s of lockdownSockets) {
    try {
      s.end();
    } catch (err) { } // tslint:disable-line
  }
  return deviceInfos.map(deviceInfo => ({
    name: deviceInfo.DeviceName,
    model: deviceInfo.ProductType,
    sdkVersion: deviceInfo.ProductVersion,
    id: deviceInfo.UniqueDeviceID,
  }));
}

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
