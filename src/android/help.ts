const help = `
  Usage: native-run android [<command>] [options]

  Commands:

    --list-avds .......... Print virtual devices and quit

`;

export async function run() {
  process.stdout.write(help);
}
