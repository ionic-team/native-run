import * as path from 'path';

describe('android/utils/sdk', () => {

  let sdkUtils: typeof import('../');
  let mockIsDir: jest.Mock;
  let mockHomedir: jest.Mock;
  let originalPlatform: string;
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    mockIsDir = jest.fn();
    mockHomedir = jest.fn().mockReturnValue('/home/me');
    originalPlatform = process.platform;
    originalProcessEnv = process.env;

    jest.resetModules();
    jest.mock('path', () => path);
    jest.mock('os', () => ({ homedir: mockHomedir }));
    jest.mock('../../../../utils/fs', () => ({ isDir: mockIsDir }));
  });

  afterEach(() => {
    Object.defineProperty(process, 'env', { value: originalProcessEnv });
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('SDK_DIRECTORIES', () => {

    describe('windows', () => {

      beforeEach(() => {
        jest.mock('path', () => path.win32);
        mockHomedir = jest.fn().mockReturnValue('C:\\Users\\me');
        jest.mock('os', () => ({ homedir: mockHomedir }));
      });

      it('should default to windows 10 local app data directory', async () => {
        Object.defineProperty(process, 'env', { value: {} });
        sdkUtils = await import('../');
        expect(sdkUtils.SDK_DIRECTORIES.get('win32')).toEqual([path.win32.join('C:\\Users\\me\\AppData\\Local\\Android\\Sdk')]);
      });

      it('should use LOCALAPPDATA environment variable if present', async () => {
        Object.defineProperty(process, 'env', { value: { LOCALAPPDATA: path.win32.join('C:\\', 'Documents and Settings', 'me', 'Application Data') } });
        sdkUtils = await import('../');
        expect(sdkUtils.SDK_DIRECTORIES.get('win32')).toEqual([path.win32.join('C:\\Documents and Settings\\me\\Application Data\\Android\\Sdk')]);
      });

    });

  });

  describe('resolveSDKRoot', () => {

    beforeEach(async () => {
      sdkUtils = await import('../');
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
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      await expect(sdkUtils.resolveSDKRoot()).rejects.toThrowError('No valid Android SDK root found.');
      expect(mockIsDir).toHaveBeenCalledTimes(1);
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Library/Android/sdk');
    });

  });

});
