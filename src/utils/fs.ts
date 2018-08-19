import * as fs from 'fs';
import * as util from 'util';

export const stat = util.promisify(fs.stat);
export const readdir = util.promisify(fs.readdir);
export const readFile = util.promisify(fs.readFile);

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
