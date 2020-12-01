export type IOSLibErrorCode = 'DeviceLocked';

export class IOSLibError extends Error implements NodeJS.ErrnoException {
  constructor(message: string, readonly code: IOSLibErrorCode) {
    super(message);
  }
}
