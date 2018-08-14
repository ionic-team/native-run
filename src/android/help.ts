const help = `
  Usage: native-run android [command] [options]

  Commands:

    list-avds .......... List virtual devices

`;

export async function run() {
  process.stdout.write(help);
}
