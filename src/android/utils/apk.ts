import { unzip } from '../../utils/unzip';

import { BinaryXmlParser } from './binary-xml-parser';

export async function readAndroidManifest(apkPath: string): Promise<any> {
  let error: Error | undefined;
  const chunks: Buffer[] = [];

  await unzip(apkPath, async (entry, zipfile, openReadStream) => {
    if (entry.fileName === 'AndroidManifest.xml') {
      const readStream = await openReadStream(entry);
      readStream.on('error', (err: Error) => (error = err));
      readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      readStream.on('end', () => zipfile.close());
    } else {
      zipfile.readEntry();
    }
  });

  if (error) {
    throw error;
  }

  const buf = Buffer.concat(chunks);
  const manifestBuffer = Buffer.from(buf);

  return new BinaryXmlParser(manifestBuffer).parse();
}

export function hasLauncherIntentFilter(activity: any): boolean {
  if (!activity.childNodes) {
    return false;
  }

  const intentFilters = activity.childNodes.filter((n: any) => n.nodeName === 'intent-filter');
  
  for (const intentFilter of intentFilters) {
    if (!intentFilter.childNodes) {
      continue;
    }

    let hasMainAction = false;
    let hasLauncherCategory = false;

    for (const childNode of intentFilter.childNodes) {
      if (childNode.nodeName === 'action') {
        const nameAttr = childNode.attributes.find((a: any) => a.name === 'name');
        if (nameAttr && nameAttr.value === 'android.intent.action.MAIN') {
          hasMainAction = true;
        }
      } else if (childNode.nodeName === 'category') {
        const nameAttr = childNode.attributes.find((a: any) => a.name === 'name');
        if (nameAttr && nameAttr.value === 'android.intent.category.LAUNCHER') {
          hasLauncherCategory = true;
        }
      }
    }

    if (hasMainAction && hasLauncherCategory) {
      return true;
    }
  }

  return false;
}

export async function getApkInfo(apkPath: string): Promise<{ appId: any; activityName: any }> {
  const doc = await readAndroidManifest(apkPath);
  const appId = doc.attributes.find((a: any) => a.name === 'package').value;
  const application = doc.childNodes.find((n: any) => n.nodeName === 'application');
  const activities = application.childNodes.filter((n: any) => n.nodeName === 'activity');

  const launcherActivity = activities.find((activity: any) => hasLauncherIntentFilter(activity));

  let selectedActivity;
  if (launcherActivity) {
    selectedActivity = launcherActivity;
  } else {
    selectedActivity = activities[0];
  }

  const activityName = selectedActivity.attributes.find((a: any) => a.name === 'name').value;

  return { appId, activityName };
}
