import * as Debug from 'debug';
import * as net from 'net';

import {
  ProtocolClient,
  ProtocolReader,
  ProtocolReaderCallback,
  ProtocolReaderFactory,
  ProtocolWriter,
} from './protocol';

const debug = Debug('native-run:ios:lib:protocol:gdb');
const ACK_SUCCESS = '+'.charCodeAt(0);

export interface GDBMessage {
  cmd: string;
  args: string[];
}

export class GDBProtocolClient extends ProtocolClient<GDBMessage> {
  constructor(socket: net.Socket) {
    super(
      socket,
      new ProtocolReaderFactory(GDBProtocolReader),
      new GDBProtocolWriter(),
    );
  }
}

export class GDBProtocolReader extends ProtocolReader {
  constructor(callback: ProtocolReaderCallback) {
    super(1 /* "Header" is '+' or '-' */, callback);
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
      .map(arg => Buffer.from(arg).toString('hex'))
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
