import { serializeError } from './errors';
import { stringify } from './utils/json';
import { Targets, formatTargets } from './utils/list';

export async function run(args: readonly string[]): Promise<void> {
  let iosError: Error | undefined;
  let androidError: Error | undefined;

  const [ios, android] = await Promise.all([
    (async (): Promise<Targets | undefined> => {
      const cmd = await import('./ios/list');

      try {
        return await cmd.list(args);
      } catch (e) {
        iosError = e;
      }
    })(),
    (async (): Promise<Targets | undefined> => {
      const cmd = await import('./android/list');

      try {
        return await cmd.list(args);
      } catch (e) {
        androidError = e;
      }
    })(),
  ]);

  if (iosError || androidError) {
    process.exitCode = 1;
  }

  if (args.includes('--json')) {
    process.stdout.write(stringify({ ios, iosError, android, androidError }));
  } else {
    process.stdout.write(`
iOS ${iosError ? '(!)' : ''}
---

${ios ? formatTargets(args, ios) : serializeError(iosError)}

Android ${androidError ? '(!)' : ''}
-------

${android ? formatTargets(args, android) : serializeError(androidError)}

    `);
  }
}
