import { stringify } from './utils/json';

export const enum ExitCode {
  GENERAL = 1,
}

export class Exception<T extends string, D = object> extends Error implements NodeJS.ErrnoException {
  constructor(readonly message: string, readonly code?: T, readonly exitCode = ExitCode.GENERAL, readonly data?: D) {
    super(message);
  }

  serialize() {
    return `${this.code ? this.code : 'ERR_UNKNOWN'}: ${this.message}`;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...this.data,
    };
  }
}

export const ERR_BAD_INPUT = 'ERR_BAD_INPUT';
export const ERR_ALREADY_RUNNING = 'ERR_ALREADY_RUNNING ';
export const ERR_AVD_HOME_NOT_FOUND = 'ERR_AVD_HOME_NOT_FOUND';
export const ERR_EMULATOR_HOME_NOT_FOUND = 'ERR_EMULATOR_HOME_NOT_FOUND';
export const ERR_INCOMPATIBLE_UPDATE = 'ERR_INCOMPATIBLE_UPDATE';
export const ERR_VERSION_DOWNGRADE = 'ERR_VERSION_DOWNGRADE';
export const ERR_INVALID_SDK_PACKAGE = 'ERR_INVALID_SDK_PACKAGE';
export const ERR_INVALID_SERIAL = 'ERR_INVALID_SERIAL';
export const ERR_INVALID_SKIN = 'ERR_INVALID_SKIN';
export const ERR_INVALID_SYSTEM_IMAGE = 'ERR_INVALID_SYSTEM_IMAGE';
export const ERR_NON_ZERO_EXIT = 'ERR_NON_ZERO_EXIT';
export const ERR_NO_AVDS_FOUND = 'ERR_NO_AVDS_FOUND';
export const ERR_MISSING_SYSTEM_IMAGE = 'ERR_MISSING_SYSTEM_IMAGE';
export const ERR_UNSUITABLE_API_INSTALLATION = 'ERR_UNSUITABLE_API_INSTALLATION';
export const ERR_SDK_NOT_FOUND = 'ERR_SDK_NOT_FOUND';
export const ERR_SDK_PACKAGE_NOT_FOUND = 'ERR_SDK_PACKAGE_NOT_FOUND';
export const ERR_SDK_UNSATISFIED_PACKAGES = 'ERR_SDK_UNSATISFIED_PACKAGES';
export const ERR_TARGET_NOT_FOUND = 'ERR_TARGET_NOT_FOUND';
export const ERR_NO_DEVICE = 'ERR_NO_DEVICE';
export const ERR_NO_TARGET = 'ERR_NO_TARGET';
export const ERR_UNKNOWN_AVD = 'ERR_UNKNOWN_AVD';
export const ERR_UNSUPPORTED_API_LEVEL = 'ERR_UNSUPPORTED_API_LEVEL';

export type CLIExceptionCode = (
  typeof ERR_BAD_INPUT
);

export class CLIException extends Exception<CLIExceptionCode> {}

export type ADBExceptionCode = (
  typeof ERR_INCOMPATIBLE_UPDATE |
  typeof ERR_VERSION_DOWNGRADE |
  typeof ERR_NON_ZERO_EXIT
);

export class ADBException extends Exception<ADBExceptionCode> {}

export type AVDExceptionCode = (
  typeof ERR_INVALID_SKIN |
  typeof ERR_INVALID_SYSTEM_IMAGE |
  typeof ERR_UNSUITABLE_API_INSTALLATION |
  typeof ERR_UNSUPPORTED_API_LEVEL |
  typeof ERR_SDK_UNSATISFIED_PACKAGES |
  typeof ERR_MISSING_SYSTEM_IMAGE
);

export class AVDException extends Exception<AVDExceptionCode> {}

export type EmulatorExceptionCode = (
  typeof ERR_ALREADY_RUNNING |
  typeof ERR_AVD_HOME_NOT_FOUND |
  typeof ERR_INVALID_SERIAL |
  typeof ERR_NON_ZERO_EXIT |
  typeof ERR_UNKNOWN_AVD
);

export class EmulatorException extends Exception<EmulatorExceptionCode> {}

export type RunExceptionCode = (
  typeof ERR_NO_AVDS_FOUND |
  typeof ERR_TARGET_NOT_FOUND |
  typeof ERR_NO_DEVICE |
  typeof ERR_NO_TARGET
);

export class RunException extends Exception<RunExceptionCode> {}

export type SDKExceptionCode = (
  typeof ERR_AVD_HOME_NOT_FOUND |
  typeof ERR_EMULATOR_HOME_NOT_FOUND |
  typeof ERR_INVALID_SDK_PACKAGE |
  typeof ERR_SDK_NOT_FOUND |
  typeof ERR_SDK_PACKAGE_NOT_FOUND
);

export class SDKException extends Exception<SDKExceptionCode> {}

export function serializeError(e = new Error()): string {
  const stack = String(e.stack ? e.stack : e);

  if (process.argv.includes('--json')) {
    return stringify(e instanceof Exception ? e : { error: stack });
  }

  return (e instanceof Exception ? e.serialize() : stack) + '\n';
}
