export class Exception<T extends string> extends Error implements NodeJS.ErrnoException {
  constructor(readonly message: string, readonly code?: T, readonly exitCode = 1) {
    super(message);
  }
}

export const ERR_UNKNOWN_AVD = 'ERR_UNKNOWN_AVD';
export type EmulatorExceptionCode = typeof ERR_UNKNOWN_AVD;
export class EmulatorException extends Exception<EmulatorExceptionCode> {}

export const ERR_NO_AVDS_FOUND = 'ERR_NO_AVDS_FOUND';
export type RunExceptionCode = typeof ERR_NO_AVDS_FOUND;
export class RunException extends Exception<RunExceptionCode> {}
