import { Readable } from 'stream';
import { promisify } from 'util';
import { Entry, Options, ZipFile, ZipFileOptions } from 'yauzl';

// Specify which of possible overloads is being promisified
type YauzlOpenReadStream = (entry: Entry, options?: ZipFileOptions, callback?: (err: Error, stream: Readable) => void) => void;
type YauzlOpen = (path: string, options?: Options, callback?: (err: Error, zipfile: ZipFile) => void) => void;
type UnzipOnEntry = (entry: Entry, zipfile: ZipFile, openReadStream: (arg1: Entry, arg2?: ZipFileOptions) => Promise<Readable>) => void;

export async function unzip(srcPath: string, onEntry: UnzipOnEntry) {
  const yauzl = await import('yauzl');
  const open = promisify(yauzl.open.bind(yauzl) as YauzlOpen);

  return new Promise<void>(async (resolve, reject) => {
    try {
      const zipfile = await open(srcPath, { lazyEntries: true });
      const openReadStream = promisify(zipfile.openReadStream.bind(zipfile) as YauzlOpenReadStream);
      zipfile.once('error', reject);
      // resolve when either one happens
      zipfile.once('close', resolve); // fd of zip closed
      zipfile.once('end', resolve); // last entry read
      zipfile.on('entry', entry => onEntry(entry, zipfile, openReadStream));
      zipfile.readEntry();
    } catch (error) {
      reject(error);
    }
  });
}
