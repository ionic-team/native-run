const help = `
  Usage: native-run <platform> <device> [options]

  Inputs:

    <platform> ........... android or ios
    <device> ............. device ID

  Options:

    --list ............... List devices and simulators/emulators
    --json ............... Output messages in JSON
`;

export async function run() {
  process.stdout.write(help);
}
