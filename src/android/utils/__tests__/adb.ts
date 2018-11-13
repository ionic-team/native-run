import * as adbUtils from '../adb';

describe('android/utils/adb', () => {

  describe('parseAdbDevices', () => {

    it('should parse emulator-5554 device', async () => {
      const output = `
List of devices attached
emulator-5554          device product:sdk_gphone_x86 model:Android_SDK_built_for_x86 device:generic_x86 transport_id:88\n\n`;
      const devices = await adbUtils.parseAdbDevices(output);

      expect(devices).toEqual([
        {
          serial: 'emulator-5554',
          state: 'device',
          type: 'emulator',
          manufacturer: '',
          model: 'Android_SDK_built_for_x86',
          product: '',
          sdkVersion: '',
          properties: {
            product: 'sdk_gphone_x86',
            model: 'Android_SDK_built_for_x86',
            device: 'generic_x86',
            transport_id: '88',
          },
        },
      ]);
    });

    it('should parse hardware device (LGUS996e5ef677)', async () => {
      const output = `
List of devices attached
LGUS996e5ef677         device usb:341835776X product:elsa_nao_us model:LG_US996 device:elsa transport_id:85\n\n`;
      const devices = await adbUtils.parseAdbDevices(output);

      expect(devices).toEqual([
        {
          serial: 'LGUS996e5ef677',
          state: 'device',
          type: 'hardware',
          manufacturer: '',
          model: 'LG_US996',
          product: '',
          sdkVersion: '',
          properties: {
            usb: '341835776X',
            product: 'elsa_nao_us',
            model: 'LG_US996',
            device: 'elsa',
            transport_id: '85',
          },
        },
      ]);
    });

    it('should parse hardware device (0a388e93)', async () => {
      const output = `
List of devices attached
0a388e93      device usb:1-1 product:razor model:Nexus_7 device:flo\n\n`;
      const devices = await adbUtils.parseAdbDevices(output);

      expect(devices).toEqual([
        {
          serial: '0a388e93',
          state: 'device',
          type: 'hardware',
          manufacturer: '',
          model: 'Nexus_7',
          product: '',
          sdkVersion: '',
          properties: {
            usb: '1-1',
            product: 'razor',
            model: 'Nexus_7',
            device: 'flo',
          },
        },
      ]);
    });

  });

});
