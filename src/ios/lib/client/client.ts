import * as net from 'net';

import { ProtocolClient } from '../protocol';

export abstract class ServiceClient<T extends ProtocolClient> {
  constructor(public socket: net.Socket, protected protocolClient: T) {}
}

export class ResponseError extends Error {
  constructor(msg: string, public response: any) {
    super(msg);
  }
}
