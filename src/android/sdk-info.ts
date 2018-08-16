import { SDK, getSDK } from './utils';

export async function run(args: string[]) {
  const sdk = await getSDK();

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(sdk));
    return;
  }

  process.stdout.write(`${formatSDK(sdk)}\n\n`);
}

function formatSDK(sdk: SDK) {
  return `
Root: ${sdk.root}
AVD Home: ${sdk.avdHome}
  `.trim();
}
