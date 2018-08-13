const help = `
  Usage: native-run [<platform>] [options]

  Options:

    --list ............. List devices and simulators/emulators
`;

export async function run() {
  process.stdout.write(help);
}
