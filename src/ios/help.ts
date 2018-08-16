const help = `
  Usage: native-run ios [options]

  Options:

`;

export async function run() {
  process.stdout.write(help);
}
