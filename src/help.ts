const help = `
  Usage: native-run <platform> [<command>] [options]

  Inputs:

    <platform> ........... ios or android
    <command> ............ platform command

  Options:

    -h, --help ........... Print help for the platform and quit
    --version ............ Print version to stdout and quit
    --verbose ............ Print verbose output to stderr
`;

export async function run() {
  process.stdout.write(help);
}
