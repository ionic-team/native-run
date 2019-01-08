import { statSafe } from '@ionic/utils-fs';

export async function isDir(p: string): Promise<boolean> {
  const stats = await statSafe(p);

  if (stats && stats.isDirectory()) {
    return true;
  }

  return false;
}
