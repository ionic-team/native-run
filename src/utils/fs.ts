import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

export const stat = util.promisify(fs.stat);
export const readdir = util.promisify(fs.readdir);
export const readFile = util.promisify(fs.readFile);
export const writeFile = util.promisify(fs.writeFile);
export const mkdir = util.promisify(fs.mkdir);

export const safeStat = async (p: string): Promise<fs.Stats | undefined> => {
  try {
    return await stat(p);
  } catch (e) {
    // ignore
  }
};

export const isDir = async (p: string): Promise<boolean> => {
  const stats = await safeStat(p);

  if (stats && stats.isDirectory()) {
    return true;
  }

  return false;
};

export async function mkdirp(p: string, mode = 0o777): Promise<void> {
  const absPath = path.resolve(p);
  const pathObj = path.parse(absPath);
  const dirnames = absPath.split(path.sep).splice(1);
  const dirs = dirnames.map((v, i) => path.resolve(pathObj.root, ...dirnames.slice(0, i), v));

  for (const dir of dirs) {
    try {
      await mkdir(dir, mode);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }
  }
}
