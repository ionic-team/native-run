import type { Device } from '../adb';
import { isLikelyEmulator, findAvailableEmulatorPort } from '../run';

describe('android/utils/run', () => {
  describe('isLikelyEmulator', () => {
    it('detects emulator by serial', () => {
      const d = {
        serial: 'emulator-5554',
        state: 'device',
        type: 'hardware',
        connection: null,
        properties: {},
        manufacturer: '',
        model: '',
        product: '',
        sdkVersion: '',
      } as Device;
      expect(isLikelyEmulator(d)).toBe(true);
    });

    it('detects emulator by type', () => {
      const d = {
        serial: 'device-1',
        state: 'device',
        type: 'emulator',
        connection: null,
        properties: {},
        manufacturer: '',
        model: '',
        product: '',
        sdkVersion: '',
      } as Device;
      expect(isLikelyEmulator(d)).toBe(true);
    });

    it('detects emulator by properties.device', () => {
      const d = {
        serial: 'device-2',
        state: 'device',
        type: 'hardware',
        connection: null,
        properties: { device: 'emu64a' },
        manufacturer: '',
        model: '',
        product: '',
        sdkVersion: '',
      } as Device;
      expect(isLikelyEmulator(d)).toBe(true);
    });

    it('detects emulator by properties.product', () => {
      const d = {
        serial: 'device-3',
        state: 'device',
        type: 'hardware',
        connection: null,
        properties: { product: 'sdk_gphone_arm64' },
        manufacturer: '',
        model: '',
        product: '',
        sdkVersion: '',
      } as Device;
      expect(isLikelyEmulator(d)).toBe(true);
    });

    it('returns false for real hardware', () => {
      const d = {
        serial: '0123456789',
        state: 'device',
        type: 'hardware',
        connection: null,
        properties: { product: 'samsung' },
        manufacturer: '',
        model: 'SM-G',
        product: '',
        sdkVersion: '',
      } as Device;
      expect(isLikelyEmulator(d)).toBe(false);
    });
  });

  describe('findAvailableEmulatorPort', () => {
    it('picks first free even port', async () => {
      const devices: Device[] = [
        { serial: 'emulator-5554', type: 'emulator', properties: {}, model: '' } as Device,
        { serial: 'emulator-5556', type: 'emulator', properties: {}, model: '' } as Device,
      ];

      const port = await findAvailableEmulatorPort(devices, 5554, 5560);
      expect(port).toBe(5558);
    });

    it('falls back to 5554 when none found in range', async () => {
      // mark the only port in the range as already used
      const devices: Device[] = [
        {
          serial: 'emulator-6000',
          state: 'device',
          type: 'emulator',
          connection: null,
          properties: {},
          manufacturer: '',
          model: '',
          product: '',
          sdkVersion: '',
        } as Device,
      ];

      const port = await findAvailableEmulatorPort(devices, 6000, 6000);
      expect(port).toBe(5554);
    });
  });
});
