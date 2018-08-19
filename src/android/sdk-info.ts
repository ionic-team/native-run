import { SDK, getSDK } from './utils/sdk';

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
SDK Root:           ${sdk.root}
SDK Tools:          ${sdk.tools.path} (${sdk.tools.version})
SDK Platform Tools: ${sdk.platformTools.path} (${sdk.platformTools.version})
Android Emulator:   ${sdk.emulator.path} (${sdk.emulator.version})
AVDs Home:          ${sdk.avds.home}
  `.trim();
}
