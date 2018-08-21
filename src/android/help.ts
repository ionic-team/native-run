const help = `
  Usage: native-run android [options]

  Options:

    --list ............... Print available targets, then quit
    --sdk-info ........... Print SDK information, then quit

    --apk ................ Deploy specified APK
    --target ............. Use a specific target
`;

export async function run() {
  process.stdout.write(help);
}
