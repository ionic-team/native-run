const help = `
  Usage: native-run android [<command>] [options]

  Commands:

    --sdk-root ........... Print SDK directory and quit
    --list-avds .......... Print virtual devices and quit

`;

export async function run() {
  process.stdout.write(help);
}
