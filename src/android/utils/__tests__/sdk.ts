import * as sdkUtils from '../sdk';

describe('android/utils/sdk', () => {

  describe('resolveSDKRoot', () => {

    let originalProcessEnv;

    beforeEach(() => {
      originalProcessEnv = process.env;
    });

    afterEach(() => {
      process.env = originalProcessEnv;
    });

    it('should fail with empty env', async () => {
      process.env = {};
      await expect(sdkUtils.resolveSDKRoot()).rejects.toThrowError('No valid Android SDK root found.');
    });

  });

});
