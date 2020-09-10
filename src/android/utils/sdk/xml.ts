import { readFile } from '@ionic/utils-fs';

import { ERR_INVALID_SDK_PACKAGE, SDKException } from '../../../errors';

export function getAPILevelFromPackageXml(
  packageXml: import('elementtree').ElementTree,
): string | undefined {
  const apiLevel = packageXml.find('./localPackage/type-details/api-level');

  return apiLevel && apiLevel.text ? apiLevel.text.toString() : undefined;
}

export async function readPackageXml(
  path: string,
): Promise<import('elementtree').ElementTree> {
  const et = await import('elementtree');
  const contents = await readFile(path, { encoding: 'utf8' });
  const etree = et.parse(contents);

  return etree;
}

export function getPathFromPackageXml(
  packageXml: import('elementtree').ElementTree,
): string {
  const localPackage = packageXml.find('./localPackage');

  if (!localPackage) {
    throw new SDKException(`Invalid SDK package.`, ERR_INVALID_SDK_PACKAGE);
  }

  const path = localPackage.get('path');

  if (!path) {
    throw new SDKException(
      `Invalid SDK package path.`,
      ERR_INVALID_SDK_PACKAGE,
    );
  }

  return path.toString();
}

export function getNameFromPackageXml(
  packageXml: import('elementtree').ElementTree,
): string {
  const name = packageXml.find('./localPackage/display-name');

  if (!name || !name.text) {
    throw new SDKException(
      `Invalid SDK package name.`,
      ERR_INVALID_SDK_PACKAGE,
    );
  }

  return name.text.toString();
}

export function getVersionFromPackageXml(
  packageXml: import('elementtree').ElementTree,
): string {
  const versionElements = [
    packageXml.find('./localPackage/revision/major'),
    packageXml.find('./localPackage/revision/minor'),
    packageXml.find('./localPackage/revision/micro'),
  ];

  const textFromElement = (e: import('elementtree').Element | null): string =>
    e && e.text ? e.text.toString() : '';
  const versions: string[] = [];

  for (const version of versionElements.map(textFromElement)) {
    if (!version) {
      break;
    }

    versions.push(version);
  }

  if (versions.length === 0) {
    throw new SDKException(
      `Invalid SDK package version.`,
      ERR_INVALID_SDK_PACKAGE,
    );
  }

  return versions.join('.');
}
