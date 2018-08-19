import * as Debug from 'debug';

import { execFile } from '../../utils/process';

import { SDK } from './sdk';

const debug = Debug('native-run:android:utils:adb');

export async function getDevices(sdk: SDK): Promise<Device[]> {
  const adbBin = `${sdk.platformTools.path}/adb`;
  const args = ['devices', '-l'];
  const { stdout } = await execFile(adbBin, args);

  return parseAdbDevices(stdout);
}

export interface Device {
  serial: string;
  state: string; // 'offline' | 'device' | 'no device'
  type: 'emulator' | 'hardware';
  properties: { [key: string]: string; };
}

export function parseAdbDevices(output: string): Device[] {
  const re = /^([\S]+)\s+([a-z\s]+)\s+(.*)$/;
  const lines = output.split('\n');
  lines.shift(); // remove 'List of devices attached' from lines

  const devices: Device[] = [];

  for (const line of lines) {
    if (line) {
      const m = line.match(re);

      if (m) {
        const [ , serial, state, description ] = m;
        const properties = description
          .split(/\s+/)
          .map(prop => prop.includes(':') ? prop.split(':') : undefined)
          .filter((kv): kv is [string, string] => typeof kv !== 'undefined' && typeof kv[0] === 'string' && typeof kv[1] === 'string')
          .reduce((acc, [ k, v ]) => {
            if (k && v) {
              acc[k.trim()] = v.trim();
            }

            return acc;
          }, {} as { [key: string]: string; });

        devices.push({
          serial,
          state,
          type: 'usb' in properties ? 'hardware' : 'emulator',
          properties,
        });
      } else {
        debug('adb devices output line does not match expected regex: %O', line);
      }
    }
  }

  return devices;
}
