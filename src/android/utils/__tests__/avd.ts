import * as path from 'path';

import * as iniUtils from '../../../utils/ini';
import * as avdUtils from '../avd';

describe('android/utils/avd', () => {
  describe('getAVDFromINI', () => {
    it('should properly parse Pixel_2_API_28', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Pixel_2_API_28.ini');
      const ini: any = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Pixel_2_API_28.avd'); // patch path

      const expected = {
        id: 'Pixel_2_API_28',
        path: ini.path,
        name: 'Pixel 2 API 28',
        sdkVersion: '28',
        screenDPI: 420,
        screenWidth: 1080,
        screenHeight: 1920,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse Pixel_2_XL_API_28', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Pixel_2_XL_API_28.ini');
      const ini: any = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Pixel_2_XL_API_28.avd'); // patch path

      const expected = {
        id: 'Pixel_2_XL_API_28',
        path: ini.path,
        name: 'Pixel 2 XL API 28',
        sdkVersion: '28',
        screenDPI: 560,
        screenWidth: 1440,
        screenHeight: 2880,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse Pixel_API_25', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Pixel_API_25.ini');
      const ini: any = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Pixel_API_25.avd'); // patch path

      const expected = {
        id: 'Pixel_API_25',
        path: ini.path,
        name: 'Pixel API 25',
        sdkVersion: '25',
        screenDPI: 480,
        screenWidth: 1080,
        screenHeight: 1920,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse Nexus_5X_API_24', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Nexus_5X_API_24.ini');
      const ini: any = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Nexus_5X_API_24.avd'); // patch path

      const expected = {
        id: 'Nexus_5X_API_24',
        path: ini.path,
        name: 'Nexus 5X API 24',
        sdkVersion: '24',
        screenDPI: 420,
        screenWidth: 1080,
        screenHeight: 1920,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse avdmanager_1', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/avdmanager_1.ini');
      const ini: any = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/avdmanager_1.avd'); // patch path

      const expected = {
        id: 'avdmanager_1',
        path: ini.path,
        name: 'avdmanager 1',
        sdkVersion: '28',
        screenDPI: null,
        screenWidth: null,
        screenHeight: null,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });
  });
});
