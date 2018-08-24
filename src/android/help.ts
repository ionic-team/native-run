const help = `
  Usage: native-run android [options]

    Run an APK on a device or emulator target

    Targets are selected as follows:
      1) --target using device/emulator serial number or AVD ID
      2) A connected device, unless --emulator is used
      3) A running emulator

    If the above criteria are not met, an emulator is started from a default
    AVD, which is created if it does not exist.

    Use --list to list available targets.

  Options:

    --list ............... Print available targets, then quit
    --sdk-info ........... Print SDK information, then quit

    --apk <path> ......... Deploy specified APK file
    --device ............. Use a device if available
    --emulator ........... Prefer an emulator
    --target <id> ........ Use a specific target
`;

export async function run() {
  process.stdout.write(`${help}\n`);
}
