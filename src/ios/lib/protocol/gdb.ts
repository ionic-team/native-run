import * as Debug from 'debug';
import type * as net from 'net';

import type { ProtocolReaderCallback, ProtocolWriter } from './protocol';
import { ProtocolClient, ProtocolReader, ProtocolReaderFactory } from './protocol';

const debug = Debug('native-run:ios:lib:protocol:gdb');
const ACK_SUCCESS = '+'.charCodeAt(0);

export interface GDBMessage {
  cmd: string;
  args: string[];
}

export class GDBProtocolClient extends ProtocolClient<GDBMessage> {
  constructor(socket: net.Socket) {
    super(socket, new ProtocolReaderFactory(GDBProtocolReader), new GDBProtocolWriter());
  }
}

export class GDBProtocolReader extends ProtocolReader {
  constructor(callback: ProtocolReaderCallback) {
    super(1 /* "Header" is '+' or '-' */, callback);
  }

  onData(data?: Buffer) {
    // the GDB protocol does not support body length in its header so we cannot rely on
    // the parent implementation to determine when a payload is complete
    try {
      // if there's data, add it to the existing buffer
      this.buffer = data ? Buffer.concat([this.buffer, data]) : this.buffer;

      // do we have enough bytes to proceed
      if (this.buffer.length < this.headerSize) {
        return; // incomplete header, wait for more
      }

      // first, check the header
      if (this.parseHeader(this.buffer) === -1) {
        // we have a valid header so check the body. GDB packets will always be a leading '$', data bytes,
        // a trailing '#', and a two digit checksum. minimum valid body is the empty response '$#00'
        // https://developer.apple.com/library/archive/documentation/DeveloperTools/gdb/gdb/gdb_33.html
        const packetData = this.buffer.toString().match('\\$.*#[0-9a-f]{2}');
        if (packetData == null) {
          return; // incomplete body, wait for more
        }
        // extract the body and update the buffer
        const body = Buffer.from(packetData[0]);
        this.buffer = this.buffer.slice(this.headerSize + body.length);
        // parse the payload and recurse if there is more data to process
        this.callback(this.parseBody(body));
        if (this.buffer.length) {
          this.onData();
        }
      }
    } catch (err: any) {
      this.callback(null, err);
    }
  }

  parseHeader(data: Buffer) {
    if (data[0] !== ACK_SUCCESS) {
      throw new Error('Unsuccessful debugserver response');
    } // TODO: retry?
    return -1;
  }

  parseBody(buffer: Buffer) {
    debug(`Response body: ${buffer.toString()}`);
    // check for checksum
    const checksum = buffer.slice(-3).toString();
    if (checksum.match(/#[0-9a-f]{2}/)) {
      // remove '$' prefix and checksum
      const msg = buffer.slice(1, -3).toString();
      if (validateChecksum(checksum, msg)) {
        return msg;
      } else {
        throw new Error('Invalid checksum received from debugserver');
      }
    } else {
      throw new Error("Didn't receive checksum");
    }
  }
}

export class GDBProtocolWriter implements ProtocolWriter {
  write(socket: net.Socket, msg: GDBMessage) {
    const { cmd, args } = msg;
    debug(`Socket write: ${cmd}, args: ${args}`);
    // hex encode and concat all args
    const encodedArgs = args
      .map((arg) => Buffer.from(arg).toString('hex'))
      .join()
      .toUpperCase();
    const checksumStr = calculateChecksum(cmd + encodedArgs);
    const formattedCmd = `$${cmd}${encodedArgs}#${checksumStr}`;
    socket.write(formattedCmd);
  }
}

// hex value of (sum of cmd chars mod 256)
function calculateChecksum(cmdStr: string) {
  let checksum = 0;
  for (let i = 0; i < cmdStr.length; i++) {
    checksum += cmdStr.charCodeAt(i);
  }
  let result = (checksum % 256).toString(16);
  // pad if necessary
  if (result.length === 1) {
    result = `0${result}`;
  }
  return result;
}

function validateChecksum(checksum: string, msg: string) {
  // remove '#' from checksum
  const checksumVal = checksum.slice(1);
  // remove '$' from msg and calculate its checksum
  const computedChecksum = calculateChecksum(msg);
  debug(`Checksum: ${checksumVal}, computed checksum: ${computedChecksum}`);
  return checksumVal === computedChecksum;
}
