import { Exception } from '../errors';

export interface Target {
  readonly model?: string;
  readonly name?: string;
  readonly sdkVersion: string;
  readonly id: string;
  readonly format: () => string;
}

export function list(args: string[], devices: Target[], virtualDevices: Target[]) {
  const virtualOnly = args.includes('--virtual');
  const devicesOnly = args.includes('--device');

  if (virtualOnly && devicesOnly) {
    throw new Exception('Only one of --device or --virtual may be specified');
  }

  if (args.includes('--json')) {
    let result;
    if (virtualOnly) {
      result = { virtualDevices };
    } else if (devicesOnly) {
      result = { devices };
    } else {
      result = { devices, virtualDevices };
    }
    return JSON.stringify(result, undefined, 2) + '\n';
  }

  let output = '';
  if (!virtualOnly) {
    output += printTargets('Connected Device', devices);
    if (devicesOnly) {
      return output;
    }
    output += '\n';
  }
  output += printTargets('Virtual Device', virtualDevices);
  return output;
}

function printTargets(name: string, targets: Target[]) {
  let output = `${name}s:\n\n`;
  if (targets.length === 0) {
    output += `  No ${name.toLowerCase()}s found\n`;
  } else {
    for (const target of targets) {
      output += `  ${(target.format())}\n`;
    }
  }
  return output;
}
