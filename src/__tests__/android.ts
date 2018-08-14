import * as android from '../android';

describe('android', () => {

  describe('resolveAndroidSDKRoot', () => {

    let originalProcessEnv;

    beforeEach(() => {
      originalProcessEnv = process.env;
    });

    afterEach(() => {
      process.env = originalProcessEnv;
    });

    it('should fail with empty env', async () => {
      process.env = {};
      await expect(android.resolveAndroidSDKRoot()).rejects.toThrowError('No valid Android SDK root found.');
    });

  });

});
