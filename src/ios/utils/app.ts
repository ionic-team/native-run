import { mkdirp } from '@ionic/utils-fs';
import * as Debug from 'debug';
import { createWriteStream } from 'fs';
import * as path from 'path';

import { Exception } from '../../errors';
import { execFile } from '../../utils/process';
import { unzip } from '../../utils/unzip';

const debug = Debug('native-run:ios:utils:app');

// TODO: cross platform? Use plist/bplist
export async function getBundleId(appPath: string) {
  const plistPath = path.resolve(appPath, 'Info.plist');
  try {
    const { stdout } = await execFile('/usr/libexec/PlistBuddy',
                                      ['-c', 'Print :CFBundleIdentifier', plistPath],
                                      { encoding: 'utf8' });
    if (stdout) {
      return stdout.trim();
    }
  } catch {
    // ignore
  }
  throw new Exception('Unable to get app bundle identifier');
}

export async function unzipIPA(ipaPath: string, destPath: string) {
  let error: Error | undefined;
  let appPath = '';

  await unzip(ipaPath, async (entry, zipfile, openReadStream) => {
    debug(`Unzip: ${entry.fileName}`);
    const dest = path.join(destPath, entry.fileName);
    if (entry.fileName.endsWith('/')) {
      await mkdirp(dest);
      if (entry.fileName.endsWith('.app/')) {
        appPath = entry.fileName;
      }
      zipfile.readEntry();
    } else {
      await mkdirp(path.dirname(dest));
      const readStream = await openReadStream(entry);
      readStream.on('error', (err: Error) => error = err);
      readStream.on('end', () => { zipfile.readEntry(); });
      readStream.pipe(createWriteStream(dest));
    }
  });

  if (error) {
    throw error;
  }

  if (!appPath) {
    throw new Exception('Unable to determine .app directory from .ipa');
  }
  return appPath;
}
