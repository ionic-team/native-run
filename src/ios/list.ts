import { spawnSync } from 'child_process'; // TODO: need cross-spawn for windows?

export type UDID = string;
export interface IOSDevice {
  readonly deviceClass: string;
  readonly deviceName: string;
  readonly productType: string; // TODO: map to actual model (ie. iPhone8,4 -> iPhone SE)
  readonly productVersion: string;
  readonly uniqueDeviceID: string;
}
export interface Simulator {
  readonly name: string;
  readonly version: string;
  readonly udid: string;
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
        .map(device => {
          return {
            name: device.name,
            version: runtime.version,
            udid: device.udid,
          };
        })
      )
      .reduce((prev, next) => prev.concat(next)) // flatten array of runtime devices arrays
      .sort((a, b) => a.name < b.name ? -1 : 1);
}

export async function getConnectedDevicesUDIDs(): Promise<UDID[]> {
  const iDeviceId = spawnSync('idevice_id', ['--list'], { encoding: 'utf8' });
  // split results on \n
  return iDeviceId.stdout.match(/.+/g) || [];
}

export async function getConnectedDevicesInfo(udids: UDID[]): Promise<IOSDevice[]> {
  return Promise.all(
    udids.map(udid => getConnectedDeviceInfo(udid))
  );
}

export async function getConnectedDeviceInfo(udid: UDID): Promise<IOSDevice> {
  const iDeviceInfo = spawnSync('ideviceinfo', ['--simple', '--udid', udid], { encoding: 'utf8' });
  return parseDeviceInfo(iDeviceInfo.stdout);
}

function parseDeviceInfo(deviceInfo: string): IOSDevice {
  return {
    deviceClass: matchDeviceProperty(deviceInfo, 'DeviceClass'),
    deviceName: matchDeviceProperty(deviceInfo, 'DeviceName'),
    productType: matchDeviceProperty(deviceInfo, 'ProductType'),
    productVersion: matchDeviceProperty(deviceInfo, 'ProductVersion'),
    uniqueDeviceID: matchDeviceProperty(deviceInfo, 'UniqueDeviceID'),
  };
}

function matchDeviceProperty(deviceInfo: string, prop: string) {
  const result = deviceInfo.match(new RegExp(`${prop}:\\s+(.+)`));
  if (!result || result.length !== 2) {
    return '';
  }
  return result[1];
}

export async function run(args: string[]) {
  // TODO check for darwin?
  const simulators = await getSimulators();
  const udids = await getConnectedDevicesUDIDs();
  const devices: any = await getConnectedDevicesInfo(udids);

  if (args.includes('--json')) {
    const result = { devices, simulators };
    process.stdout.write(JSON.stringify(result, undefined, 2) + '\n');
    return;
  }

  process.stdout.write('Devices:\n');
  if (devices.length === 0) {
    process.stdout.write('\n    No connected devices found\n');
  } else {
    for (const device of devices) {
      process.stdout.write(`${formatDevice(device)}\n\n`);
    }
  }

  process.stdout.write('\nSimulators:\n\n');

  for (const sim of simulators) {
    process.stdout.write(`  ${formatSimulator(sim)}\n`);
  }
}

function formatDevice(device: IOSDevice): string {
  return `
Name:     ${device.deviceName}
Version:  ${device.productVersion}
Class:    ${device.deviceClass}
Model:    ${device.productType}
UDID:     ${device.uniqueDeviceID}
`.trim();
}

function formatSimulator(sim: Simulator): string {
  return `
${sim.name} (${sim.version}) ${sim.udid}
`.trim();
}
