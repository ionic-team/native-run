const help = `
  Usage: native-run android [options]

  Options:

    --list ............... Print available targets, then quit
    --sdk-info ........... Print SDK information, then quit

    --apk <path> ......... Deploy specified APK file
    --device ............. Use a device if available (default)
    --emulator ........... Use an emulator
    --target <id> ........ Use a specific target
`;

export async function run() {
  process.stdout.write(help);
}
