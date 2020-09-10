import { unzip } from '../../utils/unzip';

import { BinaryXmlParser } from './binary-xml-parser';

export async function readAndroidManifest(apkPath: string) {
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

export async function getApkInfo(apkPath: string) {
  const doc = await readAndroidManifest(apkPath);
  const appId = doc.attributes.find((a: any) => a.name === 'package').value;
  const application = doc.childNodes.find(
    (n: any) => n.nodeName === 'application',
  );
  const activity = application.childNodes.find(
    (n: any) => n.nodeName === 'activity',
  );
  const activityName = activity.attributes.find((a: any) => a.name === 'name')
    .value;
  return { appId, activityName };
}
