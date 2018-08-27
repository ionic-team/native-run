import * as cp from 'child_process';
import * as util from 'util';

export const exec = util.promisify(cp.exec);
export const execFile = util.promisify(cp.execFile);
