import type { Readable } from 'stream';
import { promisify } from 'util';
import type { Entry, ZipFile, ZipFileOptions } from 'yauzl';

// Specify which of possible overloads is being promisified
type YauzlOpenReadStream = (
  entry: Entry,
  options?: ZipFileOptions,
  callback?: (err: Error, stream: Readable) => void,
) => void;
type UnzipOnEntry = (
  entry: Entry,
  zipfile: ZipFile,
  openReadStream: (arg1: Entry, arg2?: ZipFileOptions) => Promise<Readable>,
) => void;

export async function unzip(srcPath: string, onEntry: UnzipOnEntry) {
  const yauzl = await import('yauzl');

  return new Promise<void>((resolve, reject) => {
    yauzl.open(srcPath, { lazyEntries: true }, (err, zipfile) => {
      if (!zipfile || err) {
        return reject(err);
      }

      const openReadStream = promisify(
        zipfile.openReadStream.bind(zipfile) as YauzlOpenReadStream,
      );
      zipfile.once('error', reject);
      // resolve when either one happens
      zipfile.once('close', resolve); // fd of zip closed
      zipfile.once('end', resolve); // last entry read
      zipfile.on('entry', entry => onEntry(entry, zipfile, openReadStream));
      zipfile.readEntry();
    });
  });
}
