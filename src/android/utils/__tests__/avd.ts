import * as path from 'path';

import * as iniUtils from '../../../utils/ini';
import * as avdUtils from '../avd';

describe('android/utils/avd', () => {

  describe('getAVDFromINI', () => {

    it('should properly parse Pixel_2_API_28', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Pixel_2_API_28.ini');
      const ini = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Pixel_2_API_28.avd'); // patch path

      const expected = {
        id: 'Pixel_2_API_28',
        path: ini.path,
        name: 'Pixel 2 API 28',
        target: 28,
        screenDPI: 420,
        screenWidth: 1080,
        screenHeight: 1920,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse Pixel_2_XL_API_28', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/Pixel_2_XL_API_28.ini');
      const ini = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/Pixel_2_XL_API_28.avd'); // patch path

      const expected = {
        id: 'Pixel_2_XL_API_28',
        path: ini.path,
        name: 'Pixel 2 XL API 28',
        target: 28,
        screenDPI: 560,
        screenWidth: 1440,
        screenHeight: 2880,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

    it('should properly parse avdmanager_1', async () => {
      const inipath = path.resolve(__dirname, './fixtures/avd/avdmanager_1.ini');
      const ini = await iniUtils.readINI(inipath);
      ini.path = path.resolve(__dirname, './fixtures/avd/avdmanager_1.avd'); // patch path

      const expected = {
        id: 'avdmanager_1',
        path: ini.path,
        name: 'avdmanager 1',
        target: 28,
        screenDPI: null,
        screenWidth: null,
        screenHeight: null,
      };

      const avd = await avdUtils.getAVDFromINI(inipath, ini);
      expect(avd).toEqual(expected);
    });

  });

});
