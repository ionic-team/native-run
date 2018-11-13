import { spawnSync } from 'child_process'; // TODO: need cross-spawn for windows?
import { LockdowndClient, UsbmuxdClient } from 'node-ioslib';

export interface Simulator {
  readonly name: string;
  readonly sdkVersion: string;
  readonly id: string;
}

export interface IOSDevice {
  readonly name: string;
  readonly model: string; // TODO: map to actual model (ie. iPhone8,4 -> iPhone SE)
  readonly sdkVersion: string;
  readonly id: string;
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

interface SimCtlOutput {
  devices: SimCtlDeviceDict;
  runtimes: SimCtlRuntime[];
  devicetypes: SimCtlDeviceType[];
}

export async function getSimulators(): Promise<Simulator[]> {
    const simctl = spawnSync('xcrun', ['simctl', 'list', '--json'], { encoding: 'utf8' });
    const output: SimCtlOutput = JSON.parse(simctl.stdout);
    return output.runtimes
      .filter(runtime => runtime.name.indexOf('watch') === -1 && runtime.name.indexOf('tv') === -1)
      .map(runtime => output.devices[runtime.name]
        .filter(device => !device.availability.includes('unavailable'))
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
  usbmuxClient.socket.end();
  const deviceInfos = await Promise.all(devices.map(async device => {
    const socket = await new UsbmuxdClient(UsbmuxdClient.connectUsbmuxdSocket()).connect(device, 62078);
    const deviceInfo = await new LockdowndClient(socket).getAllValues();
    socket.end();
    return deviceInfo;
  }));

  return deviceInfos.map(deviceInfo => ({
    name: deviceInfo.DeviceName,
    model: deviceInfo.ProductType,
    sdkVersion: deviceInfo.ProductVersion,
    id: deviceInfo.UniqueDeviceID,
  }));
}
