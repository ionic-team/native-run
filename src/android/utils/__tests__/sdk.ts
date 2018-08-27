describe('android/utils/sdk', () => {

  describe('resolveSDKRoot', () => {

    let sdkUtils;
    let mockIsDir;
    let mockHomedir;
    let originalPlatform;
    let originalProcessEnv;

    beforeEach(() => {
      mockIsDir = jest.fn();
      mockHomedir = jest.fn().mockReturnValue('/home/me');
      originalPlatform = process.platform;
      originalProcessEnv = process.env;

      jest.resetModules();
      jest.mock('os', () => ({ homedir: mockHomedir }));
      jest.mock('../../../utils/fs', () => ({ isDir: mockIsDir }));

      sdkUtils = require('../sdk');
    });

    afterEach(() => {
      Object.defineProperty(process, 'env', { value: originalProcessEnv });
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should resolve with ANDROID_HOME if in environment', async () => {
      mockIsDir.mockResolvedValueOnce(true);
      Object.defineProperty(process, 'env', { value: { ANDROID_HOME: '/some/dir', ANDROID_SDK_ROOT: '/some/other/dir' } });
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual('/some/dir');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/some/dir');
    });

    it('should resolve with ANDROID_SDK_ROOT if in environment', async () => {
      mockIsDir.mockResolvedValueOnce(true);
      Object.defineProperty(process, 'env', { value: { ANDROID_SDK_ROOT: '/some/other/dir' } });
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual('/some/other/dir');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/some/other/dir');
    });

    it('should resolve with default value for empty environment on linux', async () => {
      mockIsDir.mockResolvedValueOnce(true);
      Object.defineProperty(process, 'env', { value: {} });
      Object.defineProperty(process, 'platform', { value: 'linux' });
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual('/home/me/Android/sdk');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Android/sdk');
    });

    it('should resolve with default value for empty environment on darwin', async () => {
      mockIsDir.mockResolvedValueOnce(true);
      Object.defineProperty(process, 'env', { value: {} });
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual('/home/me/Library/Android/sdk');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Library/Android/sdk');
    });

    it('should reject if no valid directories are found', async () => {
      mockIsDir.mockResolvedValueOnce(false);
      Object.defineProperty(process, 'env', { value: {} });
      await expect(sdkUtils.resolveSDKRoot()).rejects.toThrowError('No valid Android SDK root found.');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Library/Android/sdk');
    });

  });

});
