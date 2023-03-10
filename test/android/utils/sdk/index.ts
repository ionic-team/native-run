import * as path from 'node:path'

import * as sdkUtils from 'native-run/android/utils/sdk'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('android/utils/sdk', () => {
  let mockIsDir: Mock<any[], any>
  let mockHomedir: Mock<any[], any>
  let originalPlatform: string
  let originalProcessEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    mockIsDir = vi.fn()
    mockHomedir = vi.fn().mockReturnValue('/home/me')
    originalPlatform = process.platform
    originalProcessEnv = process.env

    vi.resetModules()
    vi.mock('path', () => path)
    vi.mock('os', () => ({ homedir: mockHomedir }))
    vi.mock('native-run/android/utils/sdk', () => ({ isDir: mockIsDir }))
  })

  afterEach(() => {
    Object.defineProperty(process, 'env', { value: originalProcessEnv })
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('SDK_DIRECTORIES', () => {
    describe('windows', () => {
      beforeEach(() => {
        vi.mock('path', () => path.win32)
        mockHomedir = vi.fn().mockReturnValue('C:\\Users\\me')
        vi.mock('os', () => ({ homedir: mockHomedir }))
      })

      it('should default to windows 10 local app data directory', async () => {
        Object.defineProperty(process, 'env', { value: {} })
        expect(sdkUtils.SDK_DIRECTORIES.get('win32')).toEqual([
          path.win32.join('C:\\Users\\me\\AppData\\Local\\Android\\Sdk'),
        ])
      })

      it('should use LOCALAPPDATA environment variable if present', async () => {
        Object.defineProperty(process, 'env', {
          value: {
            LOCALAPPDATA: path.win32.join(
              'C:\\',
              'Documents and Settings',
              'me',
              'Application Data',
            ),
          },
        })
        expect(sdkUtils.SDK_DIRECTORIES.get('win32')).toEqual([
          path.win32.join(
            'C:\\Documents and Settings\\me\\Application Data\\Android\\Sdk',
          ),
        ])
      })
    })
  })

  describe('resolveSDKRoot', () => {
    it('should resolve with ANDROID_HOME if in environment', async () => {
      mockIsDir.mockResolvedValueOnce(true)
      Object.defineProperty(process, 'env', {
        value: {
          ANDROID_HOME: '/some/dir',
          ANDROID_SDK_ROOT: '/some/other/dir',
        },
      })
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual('/some/dir')
      expect(mockIsDir).toHaveBeenCalledTimes(1)
      expect(mockIsDir).toHaveBeenCalledWith('/some/dir')
    })

    it('should resolve with ANDROID_SDK_ROOT if in environment', async () => {
      mockIsDir.mockResolvedValueOnce(true)
      Object.defineProperty(process, 'env', {
        value: { ANDROID_SDK_ROOT: '/some/other/dir' },
      })
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual(
        '/some/other/dir',
      )
      expect(mockIsDir).toHaveBeenCalledTimes(1)
      expect(mockIsDir).toHaveBeenCalledWith('/some/other/dir')
    })

    it('should resolve with default value for empty environment on linux', async () => {
      mockIsDir.mockResolvedValueOnce(true)
      Object.defineProperty(process, 'env', { value: {} })
      Object.defineProperty(process, 'platform', { value: 'linux' })
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual(
        '/home/me/Android/sdk',
      )
      expect(mockIsDir).toHaveBeenCalledTimes(1)
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Android/sdk')
    })

    it('should resolve with default value for empty environment on darwin', async () => {
      mockIsDir.mockResolvedValueOnce(true)
      Object.defineProperty(process, 'env', { value: {} })
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      await expect(sdkUtils.resolveSDKRoot()).resolves.toEqual(
        '/home/me/Library/Android/sdk',
      )
      expect(mockIsDir).toHaveBeenCalledTimes(1)
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Library/Android/sdk')
    })

    it('should reject if no valid directories are found', async () => {
      mockIsDir.mockResolvedValueOnce(false)
      Object.defineProperty(process, 'env', { value: {} })
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      await expect(sdkUtils.resolveSDKRoot()).rejects.toThrowError(
        'No valid Android SDK root found.',
      )
      expect(mockIsDir).toHaveBeenCalledTimes(1)
      expect(mockIsDir).toHaveBeenCalledWith('/home/me/Library/Android/sdk')
    })
  })
})
