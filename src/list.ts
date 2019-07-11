import { stringify } from './utils/json';
import { Targets, formatTargets } from './utils/list';

export async function run(args: readonly string[]): Promise<void> {
  const [ ios, android ] = await Promise.all([
    (async (): Promise<Targets> => {
      const cmd = await import('./ios/list');
      return cmd.list(args);
    })(),
    (async (): Promise<Targets> => {
      const cmd = await import('./android/list');
      return cmd.list(args);
    })(),
  ]);

  if (args.includes('--json')) {
    process.stdout.write(stringify({ ios, android }));
  } else {
    process.stdout.write(`
iOS
---

${formatTargets(args, ios)}

Android
-------

${formatTargets(args, android)}

    `);
  }
}
