import { parseAndroidConsoleResponse } from '../emulator';

const authRequiredOutput = `Android Console: Authentication required
Android Console: type 'auth <auth_token>' to authenticate
Android Console: you can find your <auth_token> in
'/Users/ionic/.emulator_console_auth_token'
OK
`;

describe('android/utils/emulator', () => {

  describe('parseAndroidConsoleResponse', () => {

    it('should not parse an event from whitespace', () => {
      for (const output of ['', '\n', '        \n']) {
        const event = parseAndroidConsoleResponse(output);
        expect(event).not.toBeDefined();
      }
    });

    it('should not parse response from output until OK', () => {
      const lines = authRequiredOutput.split('\n').slice(0, -2);

      for (let i = 0; i < lines.length; i++) {
        const output = lines.slice(0, i).join('\n');
        const event = parseAndroidConsoleResponse(output);
        expect(event).not.toBeDefined();
      }
    });

    it('should parse response from output', () => {
      const expected = authRequiredOutput.split('\n').slice(0, -2).join('\n') + '\n';
      const event = parseAndroidConsoleResponse(authRequiredOutput);
      expect(event).toBe(expected);
    });

  });

});
