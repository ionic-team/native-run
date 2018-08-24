export class Exception<T extends string> extends Error implements NodeJS.ErrnoException {
  constructor(readonly message: string, readonly code?: T, readonly exitCode = 1) {
    super(message);
  }
}

export const ERR_ALREADY_RUNNING = 'ERR_ALREADY_RUNNING ';
export const ERR_AVD_HOME_NOT_FOUND = 'ERR_AVD_HOME_NOT_FOUND';
export const ERR_INCOMPATIBLE_UPDATE = 'ERR_INCOMPATIBLE_UPDATE';
export const ERR_NON_ZERO_EXIT = 'ERR_NON_ZERO_EXIT';
export const ERR_NO_AVDS_FOUND = 'ERR_NO_AVDS_FOUND';
export const ERR_UNKNOWN_AVD = 'ERR_UNKNOWN_AVD';
export const ERR_INVALID_SERIAL = 'ERR_INVALID_SERIAL';

export type ADBExceptionCode = (
  typeof ERR_NON_ZERO_EXIT |
  typeof ERR_INCOMPATIBLE_UPDATE
);

export class ADBException extends Exception<ADBExceptionCode> {}

export type EmulatorExceptionCode = (
  typeof ERR_INVALID_SERIAL |
  typeof ERR_ALREADY_RUNNING |
  typeof ERR_NON_ZERO_EXIT |
  typeof ERR_UNKNOWN_AVD |
  typeof ERR_AVD_HOME_NOT_FOUND
);

export class EmulatorException extends Exception<EmulatorExceptionCode> {}

export type RunExceptionCode = (
  typeof ERR_NO_AVDS_FOUND
);

export class RunException extends Exception<RunExceptionCode> {}
