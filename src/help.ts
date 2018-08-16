const help = `
  Usage: native-run <platform> [options]

  Inputs:

    <platform> ........... ios or android

  Options:

    -h, --help ........... Print help for the platform and quit
    --version ............ Print version and quit
    --verbose ............ Print verbose output to stderr

`;

export async function run() {
  process.stdout.write(help);
}
