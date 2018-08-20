const help = `
  Usage: native-run android [options]

  Options:

    --sdk-root ........... Print SDK directory, then quit
    --list-avds .......... Print virtual devices, then quit
    --list-devices ....... Print connected devices and emulators, then quit

`;

export async function run() {
  process.stdout.write(help);
}
