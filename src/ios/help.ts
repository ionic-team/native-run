const help = `
  Usage: native-run ios [<command>] [options]

  Commands:

`;

export async function run() {
  process.stdout.write(help);
}
