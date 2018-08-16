/* tslint:disable */
export type UDID = string;

export async function getConnectedDeviceUDIDs(): Promise<UDID[]> {
  const child_process = await import('child_process');
  const iDeviceId = child_process.spawnSync('idevice_id', ['-l'], { encoding: 'utf8' });
  // split results on \n
  return iDeviceId.stdout.match(/.+/g) || [];
}
