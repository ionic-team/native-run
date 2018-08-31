import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as through2 from 'through2';
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

export interface WalkerItem {
  readonly path: string;
  readonly stats: fs.Stats;
}

export interface Walker extends stream.Readable {
  on(event: 'data', callback: (item: WalkerItem) => void): this;
  on(event: string, callback: (...args: any[]) => any): this;
}

export interface WalkerOptions {
  pathFilter?: (p: string) => boolean;
}

export class Walker extends stream.Readable {
  readonly paths: string[] = [this.p];

  constructor(readonly p: string, readonly options: WalkerOptions = {}) {
    super({
      objectMode: true,
    });
  }

  _read() {
    const p = this.paths.shift();
    const { pathFilter } = this.options;

    if (!p) {
      this.push(null);
      return;
    }

    fs.stat(p, (err, stats) => {
      if (err) {
        this.emit('error', err);
        return;
      }

      const item: WalkerItem = { path: p, stats };

      if (stats.isDirectory()) {
        fs.readdir(p, (err, contents) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          let paths = contents.map(file => path.join(p, file));

          if (pathFilter) {
            paths = paths.filter(p => pathFilter(p.substring(this.p.length + 1)));
          }

          this.paths.push(...paths);
          this.push(item);
        });
      } else {
        this.push(item);
      }
    });
  }
}

export function walk(p: string, options: WalkerOptions = {}): NodeJS.ReadableStream {
  return new Walker(p, options);
}

export interface ReadDirROptions {
  filter?: (item: WalkerItem) => boolean;
  walkerOptions?: WalkerOptions;
}

export async function readdirr(dir: string, { filter, walkerOptions }: ReadDirROptions = {}): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const items: string[] = [];

    let rs = walk(dir, walkerOptions);

    if (filter) {
      rs = rs.pipe(through2.obj(function(obj, enc, cb) {
        if (!filter || filter(obj)) {
          this.push(obj);
        }

        cb();
      }));
    }

    rs
      .on('error', err => reject(err))
      .on('data', item => items.push(item.path))
      .on('end', () => resolve(items));
  });
}
