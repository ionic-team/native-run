import { RunOptions } from './definitions';
import { getDevices as getAndroidDevices } from './android';

export async function run(platform: string | undefined, options: RunOptions) {
  // TODO: do something with platform arg

  const androidDevices = await getAndroidDevices();

  console.log(androidDevices);
}
