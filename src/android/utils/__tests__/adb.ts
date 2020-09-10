import * as os from 'os';

describe('android/utils/adb', () => {
  describe('parseAdbDevices', () => {
    let adbUtils: typeof import('../adb');

    beforeEach(async () => {
      jest.resetModules();
      adbUtils = await import('../adb');
    });

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
          connection: null,
          manufacturer: '',
          model: 'Android_SDK_built_for_x86',
          product: 'sdk_gphone_x86',
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
          connection: 'usb',
          manufacturer: '',
          model: 'LG_US996',
          product: 'elsa_nao_us',
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
          connection: 'usb',
          manufacturer: '',
          model: 'Nexus_7',
          product: 'razor',
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

    it('should parse hardware device over tcpip (192.168.0.3:5555)', async () => {
      const output = `
List of devices attached
192.168.0.3:5555       device product:mido model:Redmi_Note_4 device:mido transport_id:1\n\n`;
      const devices = adbUtils.parseAdbDevices(output);

      expect(devices).toEqual([
        {
          serial: '192.168.0.3:5555',
          state: 'device',
          type: 'hardware',
          connection: 'tcpip',
          manufacturer: '',
          model: 'Redmi_Note_4',
          product: 'mido',
          sdkVersion: '',
          properties: {
            device: 'mido',
            product: 'mido',
            model: 'Redmi_Note_4',
            transport_id: '1',
          },
        },
      ]);
    });

    it('should parse hardware device from line without usb (98897a474748594558)', async () => {
      const output = `
List of devices attached
98897a474748594558     device product:dreamqltesq model:SM_G950U device:dreamqltesq transport_id:2\n\n`;
      const devices = adbUtils.parseAdbDevices(output);

      expect(devices).toEqual([
        {
          serial: '98897a474748594558',
          state: 'device',
          type: 'hardware',
          connection: null,
          manufacturer: '',
          model: 'SM_G950U',
          product: 'dreamqltesq',
          sdkVersion: '',
          properties: {
            device: 'dreamqltesq',
            product: 'dreamqltesq',
            model: 'SM_G950U',
            transport_id: '2',
          },
        },
      ]);
    });

    describe('windows', () => {
      let adbUtils: typeof import('../adb');

      beforeEach(async () => {
        jest.resetModules();
        jest.mock('os', () => ({ ...os, EOL: '\r\n' }));

        adbUtils = await import('../adb');
      });

      it('should parse hardware device (MWS0216B24001482)', async () => {
        const output = `\r\nList of devices attached\r\nMWS0216B24001482       offline transport_id:3\r\n\r\n`;
        const devices = await adbUtils.parseAdbDevices(output);

        expect(devices).toEqual([
          {
            serial: 'MWS0216B24001482',
            state: 'offline',
            type: 'hardware',
            connection: null,
            manufacturer: '',
            model: '',
            product: '',
            sdkVersion: '',
            properties: {
              transport_id: '3',
            },
          },
        ]);
      });
    });
  });
});
