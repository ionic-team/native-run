declare module 'bplist-parser' {
  export const maxObjectSize = 100000000; // 100Meg
  export const maxObjectCount = 32768;
  export function UID(id: string): void;
  export function parseFile(
    fileNameOrBuffer: string | Buffer,
    callback: (err: Error, result: any) => any,
  ): any;
  export function parseBuffer(buffer: Buffer): any;
}
