import { stringify } from './utils/json'

export const enum ExitCode {
  GENERAL = 1,
}

export class Exception<T extends string, D = { [key: string]: string }>
  extends Error
  implements NodeJS.ErrnoException {
  constructor(
    readonly message: string,
    readonly code?: T,
    readonly exitCode = ExitCode.GENERAL,
    readonly data?: D,
  ) {
    super(message)
  }

  serialize(): string {
    return `${this.code ? this.code : 'ERR_UNKNOWN'}: ${this.message}`
  }

  toJSON(): any {
    return {
      error: this.message,
      code: this.code,
      ...this.data,
    }
  }
}

export class AndroidException<
  T extends string,
  D = { [key: string]: string },
> extends Exception<T, D> {
  serialize(): string {
    return (
      `${super.serialize()}\n\n`
      + '\tMore details for this error may be available online:\n\n'
      + '\thttps://github.com/ionic-team/native-run/wiki/Android-Errors'
    )
  }
}

export const ERR_BAD_INPUT = 'ERR_BAD_INPUT'
export const ERR_ALREADY_RUNNING = 'ERR_ALREADY_RUNNING '
export const ERR_AVD_HOME_NOT_FOUND = 'ERR_AVD_HOME_NOT_FOUND'
export const ERR_EMULATOR_HOME_NOT_FOUND = 'ERR_EMULATOR_HOME_NOT_FOUND'
export const ERR_INCOMPATIBLE_UPDATE = 'ERR_INCOMPATIBLE_UPDATE'
export const ERR_VERSION_DOWNGRADE = 'ERR_VERSION_DOWNGRADE'
export const ERR_MIN_SDK_VERSION = 'ERR_MIN_SDK_VERSION'
export const ERR_NO_CERTIFICATES = 'ERR_NO_CERTIFICATES'
export const ERR_NOT_ENOUGH_SPACE = 'ERR_NOT_ENOUGH_SPACE'
export const ERR_DEVICE_OFFLINE = 'ERR_DEVICE_OFFLINE'
export const ERR_INVALID_SDK_PACKAGE = 'ERR_INVALID_SDK_PACKAGE'
export const ERR_INVALID_SERIAL = 'ERR_INVALID_SERIAL'
export const ERR_INVALID_SKIN = 'ERR_INVALID_SKIN'
export const ERR_INVALID_SYSTEM_IMAGE = 'ERR_INVALID_SYSTEM_IMAGE'
export const ERR_NON_ZERO_EXIT = 'ERR_NON_ZERO_EXIT'
export const ERR_NO_AVDS_FOUND = 'ERR_NO_AVDS_FOUND'
export const ERR_MISSING_SYSTEM_IMAGE = 'ERR_MISSING_SYSTEM_IMAGE'
export const ERR_UNSUITABLE_API_INSTALLATION
  = 'ERR_UNSUITABLE_API_INSTALLATION'
export const ERR_SDK_NOT_FOUND = 'ERR_SDK_NOT_FOUND'
export const ERR_SDK_PACKAGE_NOT_FOUND = 'ERR_SDK_PACKAGE_NOT_FOUND'
export const ERR_SDK_UNSATISFIED_PACKAGES = 'ERR_SDK_UNSATISFIED_PACKAGES'
export const ERR_TARGET_NOT_FOUND = 'ERR_TARGET_NOT_FOUND'
export const ERR_NO_DEVICE = 'ERR_NO_DEVICE'
export const ERR_NO_TARGET = 'ERR_NO_TARGET'
export const ERR_DEVICE_LOCKED = 'ERR_DEVICE_LOCKED'
export const ERR_UNKNOWN_AVD = 'ERR_UNKNOWN_AVD'
export const ERR_UNSUPPORTED_API_LEVEL = 'ERR_UNSUPPORTED_API_LEVEL'

export type CLIExceptionCode = typeof ERR_BAD_INPUT

export class CLIException extends Exception<CLIExceptionCode> {}

export type ADBExceptionCode =
  | typeof ERR_INCOMPATIBLE_UPDATE
  | typeof ERR_VERSION_DOWNGRADE
  | typeof ERR_MIN_SDK_VERSION
  | typeof ERR_NO_CERTIFICATES
  | typeof ERR_NOT_ENOUGH_SPACE
  | typeof ERR_DEVICE_OFFLINE
  | typeof ERR_NON_ZERO_EXIT

export class ADBException extends AndroidException<ADBExceptionCode> {}

export type AVDExceptionCode =
  | typeof ERR_INVALID_SKIN
  | typeof ERR_INVALID_SYSTEM_IMAGE
  | typeof ERR_UNSUITABLE_API_INSTALLATION
  | typeof ERR_UNSUPPORTED_API_LEVEL
  | typeof ERR_SDK_UNSATISFIED_PACKAGES
  | typeof ERR_MISSING_SYSTEM_IMAGE

export class AVDException extends AndroidException<AVDExceptionCode> {}

export type EmulatorExceptionCode =
  | typeof ERR_ALREADY_RUNNING
  | typeof ERR_AVD_HOME_NOT_FOUND
  | typeof ERR_INVALID_SERIAL
  | typeof ERR_NON_ZERO_EXIT
  | typeof ERR_UNKNOWN_AVD

export class EmulatorException extends AndroidException<EmulatorExceptionCode> {}

export type AndroidRunExceptionCode =
  | typeof ERR_NO_AVDS_FOUND
  | typeof ERR_TARGET_NOT_FOUND
  | typeof ERR_NO_DEVICE
  | typeof ERR_NO_TARGET

export class AndroidRunException extends AndroidException<AndroidRunExceptionCode> {}

export type SDKExceptionCode =
  | typeof ERR_EMULATOR_HOME_NOT_FOUND
  | typeof ERR_INVALID_SDK_PACKAGE
  | typeof ERR_SDK_NOT_FOUND
  | typeof ERR_SDK_PACKAGE_NOT_FOUND

export class SDKException extends AndroidException<SDKExceptionCode> {}

export type IOSRunExceptionCode =
  | typeof ERR_TARGET_NOT_FOUND
  | typeof ERR_NO_DEVICE
  | typeof ERR_NO_TARGET
  | typeof ERR_DEVICE_LOCKED

export class IOSRunException extends Exception<IOSRunExceptionCode> {}

export function serializeError(e = new Error()): string {
  const stack = String(e.stack ? e.stack : e)

  if (process.argv.includes('--json'))
    return stringify(e instanceof Exception ? e : { error: stack })

  return `${e instanceof Exception ? e.serialize() : stack}\n`
}
