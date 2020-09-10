import * as Debug from 'debug';
import * as net from 'net';
import * as plist from 'plist';

import {
  PlistProtocolReader,
  ProtocolClient,
  ProtocolReaderFactory,
  ProtocolWriter,
} from './protocol';

const debug = Debug('native-run:ios:lib:protocol:usbmux');

export const USBMUXD_HEADER_SIZE = 16;

export interface UsbmuxMessage {
  messageType: string;
  extraFields?: { [key: string]: any };
}

export class UsbmuxProtocolClient extends ProtocolClient<UsbmuxMessage> {
  constructor(socket: net.Socket) {
    super(
      socket,
      new ProtocolReaderFactory(UsbmuxProtocolReader),
      new UsbmuxProtocolWriter(),
    );
  }
}

export class UsbmuxProtocolReader extends PlistProtocolReader {
  constructor(callback: (data: any) => any) {
    super(USBMUXD_HEADER_SIZE, callback);
  }

  parseHeader(data: Buffer) {
    return data.readUInt32LE(0) - USBMUXD_HEADER_SIZE;
  }

  parseBody(data: Buffer) {
    const resp = super.parseBody(data);
    debug(`Response: ${JSON.stringify(resp)}`);
    return resp;
  }
}

export class UsbmuxProtocolWriter implements ProtocolWriter {
  private useTag = 0;

  write(socket: net.Socket, msg: UsbmuxMessage) {
    // TODO Usbmux message type
    debug(`socket write: ${JSON.stringify(msg)}`);
    const { messageType, extraFields } = msg;
    const plistMessage = plist.build({
      BundleID: 'io.ionic.native-run', // TODO
      ClientVersionString: 'usbmux.js', // TODO
      MessageType: messageType,
      ProgName: 'native-run', // TODO
      kLibUSBMuxVersion: 3,
      ...extraFields,
    });

    const dataSize = plistMessage ? plistMessage.length : 0;
    const protocolVersion = 1;
    const messageCode = 8;

    const header = Buffer.alloc(USBMUXD_HEADER_SIZE);
    header.writeUInt32LE(USBMUXD_HEADER_SIZE + dataSize, 0);
    header.writeUInt32LE(protocolVersion, 4);
    header.writeUInt32LE(messageCode, 8);
    header.writeUInt32LE(this.useTag++, 12); // TODO
    socket.write(header);
    socket.write(plistMessage);
  }
}
