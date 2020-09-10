import * as Debug from 'debug';
import * as net from 'net';

import {
  ProtocolClient,
  ProtocolReader,
  ProtocolReaderCallback, ProtocolReaderFactory, ProtocolWriter
} from './protocol';

const debug = Debug('native-run:ios:lib:protocol:afc');

export const AFC_MAGIC = 'CFA6LPAA';
export const AFC_HEADER_SIZE = 40;

export interface AFCHeader {
  magic: typeof AFC_MAGIC;
  totalLength: number;
  headerLength: number;
  requestId: number;
  operation: AFC_OPS;
}

export interface AFCMessage {
  operation: AFC_OPS;
  data?: any;
  payload?: any;
}

export interface AFCResponse {
  operation: AFC_OPS;
  id: number;
  data: Buffer;
}

export interface AFCStatusResponse {
  operation: AFC_OPS.STATUS;
  id: number;
  data: number;
}

/**
 * AFC Operations
 */
export enum AFC_OPS {
  INVALID                   = 0x00000000,  /* Invalid */
  STATUS                    = 0x00000001,  /* Status */
  DATA                      = 0x00000002,  /* Data */
  READ_DIR                  = 0x00000003,  /* ReadDir */
  READ_FILE                 = 0x00000004,  /* ReadFile */
  WRITE_FILE                = 0x00000005,  /* WriteFile */
  WRITE_PART                = 0x00000006,  /* WritePart */
  TRUNCATE                  = 0x00000007,  /* TruncateFile */
  REMOVE_PATH               = 0x00000008,  /* RemovePath */
  MAKE_DIR                  = 0x00000009,  /* MakeDir */
  GET_FILE_INFO             = 0x0000000A,  /* GetFileInfo */
  GET_DEVINFO               = 0x0000000B,  /* GetDeviceInfo */
  WRITE_FILE_ATOM           = 0x0000000C,  /* WriteFileAtomic (tmp file+rename) */
  FILE_OPEN                 = 0x0000000D,  /* FileRefOpen */
  FILE_OPEN_RES             = 0x0000000E,  /* FileRefOpenResult */
  FILE_READ                 = 0x0000000F,  /* FileRefRead */
  FILE_WRITE                = 0x00000010,  /* FileRefWrite */
  FILE_SEEK                 = 0x00000011,  /* FileRefSeek */
  FILE_TELL                 = 0x00000012,  /* FileRefTell */
  FILE_TELL_RES             = 0x00000013,  /* FileRefTellResult */
  FILE_CLOSE                = 0x00000014,  /* FileRefClose */
  FILE_SET_SIZE             = 0x00000015,  /* FileRefSetFileSize (ftruncate) */
  GET_CON_INFO              = 0x00000016,  /* GetConnectionInfo */
  SET_CON_OPTIONS           = 0x00000017,  /* SetConnectionOptions */
  RENAME_PATH               = 0x00000018,  /* RenamePath */
  SET_FS_BS                 = 0x00000019,  /* SetFSBlockSize (0x800000) */
  SET_SOCKET_BS             = 0x0000001A,  /* SetSocketBlockSize (0x800000) */
  FILE_LOCK                 = 0x0000001B,  /* FileRefLock */
  MAKE_LINK                 = 0x0000001C,  /* MakeLink */
  GET_FILE_HASH             = 0x0000001D,  /* GetFileHash */
  SET_FILE_MOD_TIME         = 0x0000001E,  /* SetModTime */
  GET_FILE_HASH_RANGE       = 0x0000001F,  /* GetFileHashWithRange */
  /* iOS 6+ */
  FILE_SET_IMMUTABLE_HINT   = 0x00000020,  /* FileRefSetImmutableHint */
  GET_SIZE_OF_PATH_CONTENTS = 0x00000021,  /* GetSizeOfPathContents */
  REMOVE_PATH_AND_CONTENTS  = 0x00000022,  /* RemovePathAndContents */
  DIR_OPEN                  = 0x00000023,  /* DirectoryEnumeratorRefOpen */
  DIR_OPEN_RESULT           = 0x00000024,  /* DirectoryEnumeratorRefOpenResult */
  DIR_READ                  = 0x00000025,  /* DirectoryEnumeratorRefRead */
  DIR_CLOSE                 = 0x00000026,  /* DirectoryEnumeratorRefClose */
  /* iOS 7+ */
  FILE_READ_OFFSET          = 0x00000027,  /* FileRefReadWithOffset */
  FILE_WRITE_OFFSET         = 0x00000028,  /* FileRefWriteWithOffset */
}

/**
 * Error Codes
 */
export enum AFC_STATUS {
  SUCCESS               =  0,
  UNKNOWN_ERROR         =  1,
  OP_HEADER_INVALID     =  2,
  NO_RESOURCES          =  3,
  READ_ERROR            =  4,
  WRITE_ERROR           =  5,
  UNKNOWN_PACKET_TYPE   =  6,
  INVALID_ARG           =  7,
  OBJECT_NOT_FOUND      =  8,
  OBJECT_IS_DIR         =  9,
  PERM_DENIED           = 10,
  SERVICE_NOT_CONNECTED = 11,
  OP_TIMEOUT            = 12,
  TOO_MUCH_DATA         = 13,
  END_OF_DATA           = 14,
  OP_NOT_SUPPORTED      = 15,
  OBJECT_EXISTS         = 16,
  OBJECT_BUSY           = 17,
  NO_SPACE_LEFT         = 18,
  OP_WOULD_BLOCK        = 19,
  IO_ERROR              = 20,
  OP_INTERRUPTED        = 21,
  OP_IN_PROGRESS        = 22,
  INTERNAL_ERROR        = 23,
  MUX_ERROR             = 30,
  NO_MEM                = 31,
  NOT_ENOUGH_DATA       = 32,
  DIR_NOT_EMPTY         = 33,
  FORCE_SIGNED_TYPE     = -1,
}

export enum AFC_FILE_OPEN_FLAGS {
  RDONLY   = 0x00000001,  // r   O_RDONLY
  RW       = 0x00000002,  // r+  O_RDWR   | O_CREAT
  WRONLY   = 0x00000003,  // w   O_WRONLY | O_CREAT  | O_TRUNC
  WR       = 0x00000004,  // w+  O_RDWR   | O_CREAT  | O_TRUNC
  APPEND   = 0x00000005,  // a   O_WRONLY | O_APPEND | O_CREAT
  RDAPPEND = 0x00000006,  // a+  O_RDWR   | O_APPEND | O_CREAT
}

function isAFCResponse(resp: any): resp is AFCResponse {
  return AFC_OPS[resp.operation] !== undefined && resp.id !== undefined && resp.data !== undefined;
}

function isStatusResponse(resp: any): resp is AFCStatusResponse {
  return isAFCResponse(resp) && resp.operation === AFC_OPS.STATUS;
}

function isErrorStatusResponse(resp: AFCResponse): boolean {
  return isStatusResponse(resp) && resp.data !== AFC_STATUS.SUCCESS;
}

class AFCInternalError extends Error {
  constructor(msg: string, public requestId: number) {
    super(msg);
  }
}

export class AFCError extends Error {
  constructor(msg: string, public status: AFC_STATUS) {
    super(msg);
  }
}

export class AFCProtocolClient extends ProtocolClient {
  private requestId = 0;
  private requestCallbacks: { [key: number]: ProtocolReaderCallback } = {};

  constructor(socket: net.Socket) {
    super(
      socket,
      new ProtocolReaderFactory(AFCProtocolReader),
      new AFCProtocolWriter()
    );

    const reader = this.readerFactory.create((resp, err) => {
      if (err && err instanceof AFCInternalError) {
        this.requestCallbacks[err.requestId](resp, err);
      } else if (isErrorStatusResponse(resp)) {
        this.requestCallbacks[resp.id](resp, new AFCError(AFC_STATUS[resp.data], resp.data));
      } else {
        this.requestCallbacks[resp.id](resp);
      }
    });
    socket.on('data', reader.onData);
  }

  sendMessage(msg: AFCMessage): Promise<AFCResponse> {
    return new Promise<AFCResponse>((resolve, reject) => {
      const requestId = this.requestId++;
      this.requestCallbacks[requestId] = async (resp: any, err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        if (isAFCResponse(resp)) {
          resolve(resp);
        } else {
          reject(new Error('Malformed AFC response'));
        }
      };
      this.writer.write(this.socket, { ...msg, requestId });
    });
  }

}

export class AFCProtocolReader extends ProtocolReader {
  private header!: AFCHeader; // TODO: ! -> ?

  constructor(callback: ProtocolReaderCallback) {
    super(AFC_HEADER_SIZE, callback);
  }

  parseHeader(data: Buffer) {
    const magic = data.slice(0, 8).toString('ascii');
    if (magic !== AFC_MAGIC) {
      throw new AFCInternalError(`Invalid AFC packet received (magic != ${AFC_MAGIC})`, data.readUInt32LE(24));
    }
    // technically these are uint64
    this.header = {
      magic,
      totalLength: data.readUInt32LE(8),
      headerLength: data.readUInt32LE(16),
      requestId: data.readUInt32LE(24),
      operation: data.readUInt32LE(32),
    };

    debug(`parse header: ${JSON.stringify(this.header)}`);
    if (this.header.headerLength < AFC_HEADER_SIZE) {
      throw new AFCInternalError('Invalid AFC header', this.header.requestId);
    }
    return this.header.totalLength - AFC_HEADER_SIZE;
  }

  parseBody(data: Buffer): AFCResponse | AFCStatusResponse {
    const body: any = {
      operation: this.header.operation,
      id: this.header.requestId,
      data,
    };
    if (isStatusResponse(body)) {
      const status = data.readUInt32LE(0);
      debug(`${AFC_OPS[this.header.operation]} response: ${AFC_STATUS[status]}`);
      body.data = status;
    } else if (data.length <= 8) {
      debug(`${AFC_OPS[this.header.operation]} response: ${Array.prototype.toString.call(body)}`);
    } else {
      debug(`${AFC_OPS[this.header.operation]} response length: ${data.length} bytes`);
    }
    return body;
  }

}

export class AFCProtocolWriter implements ProtocolWriter {

  write(socket: net.Socket, msg: AFCMessage & { requestId: number }) {
    const { data, payload, operation, requestId } = msg;

    const dataLength = data ? data.length : 0;
    const payloadLength = payload ? payload.length : 0;

    const header = Buffer.alloc(AFC_HEADER_SIZE);
    const magic = Buffer.from(AFC_MAGIC);
    magic.copy(header);
    header.writeUInt32LE(AFC_HEADER_SIZE + dataLength + payloadLength, 8);
    header.writeUInt32LE(AFC_HEADER_SIZE + dataLength, 16);
    header.writeUInt32LE(requestId, 24);
    header.writeUInt32LE(operation, 32);
    socket.write(header);
    socket.write(data);
    if (data.length <= 8) {
      debug(`socket write, header: { requestId: ${requestId}, operation: ${AFC_OPS[operation]}}, body: ${Array.prototype.toString.call(data)}`);
    } else {
      debug(`socket write, header: { requestId: ${requestId}, operation: ${AFC_OPS[operation]}}, body: ${data.length} bytes`);
    }

    debug(`socket write, bytes written ${header.length} (header), ${data.length} (body)`);
    if (payload) { socket.write(payload); }
  }

}
