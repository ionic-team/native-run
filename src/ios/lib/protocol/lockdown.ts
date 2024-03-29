import * as Debug from 'debug';
import type * as net from 'net';
import * as plist from 'plist';

import { IOSLibError } from '../lib-errors';

import type { ProtocolWriter } from './protocol';
import { PlistProtocolReader, ProtocolClient, ProtocolReaderFactory } from './protocol';

const debug = Debug('native-run:ios:lib:protocol:lockdown');
export const LOCKDOWN_HEADER_SIZE = 4;

export interface LockdownCommand {
  Command: string;
  [key: string]: any;
}

export interface LockdownResponse {
  Status: string;
  [key: string]: any;
}

export interface LockdownErrorResponse {
  Error: string;
}

export interface LockdownRequest {
  Request: string;
  [key: string]: any;
}

function isDefined(val: any) {
  return typeof val !== 'undefined';
}

export function isLockdownResponse(resp: any): resp is LockdownResponse {
  return isDefined(resp.Status);
}

export function isLockdownErrorResponse(resp: any): resp is LockdownErrorResponse {
  return isDefined(resp.Error);
}

export class LockdownProtocolClient<
  MessageType extends LockdownRequest | LockdownCommand = LockdownRequest,
> extends ProtocolClient<MessageType> {
  constructor(socket: net.Socket) {
    super(socket, new ProtocolReaderFactory(LockdownProtocolReader), new LockdownProtocolWriter());
  }
}

export class LockdownProtocolReader extends PlistProtocolReader {
  constructor(callback: (data: any) => any) {
    super(LOCKDOWN_HEADER_SIZE, callback);
  }

  parseHeader(data: Buffer) {
    return data.readUInt32BE(0);
  }

  parseBody(data: Buffer) {
    const resp = super.parseBody(data);
    debug(`Response: ${JSON.stringify(resp)}`);
    if (isLockdownErrorResponse(resp)) {
      if (resp.Error === 'DeviceLocked') {
        throw new IOSLibError('Device is currently locked.', 'DeviceLocked');
      }

      throw new Error(resp.Error);
    }
    return resp;
  }
}

export class LockdownProtocolWriter implements ProtocolWriter {
  write(socket: net.Socket, plistData: any) {
    debug(`socket write: ${JSON.stringify(plistData)}`);
    const plistMessage = plist.build(plistData);
    const header = Buffer.alloc(LOCKDOWN_HEADER_SIZE);
    header.writeUInt32BE(plistMessage.length, 0);
    socket.write(header);
    socket.write(plistMessage);
  }
}
