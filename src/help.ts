const help = `
  Usage: native-run [ios|android] [options]

  Options:

    -h, --help ........... Print help for the platform, then quit
    --version ............ Print version, then quit
    --verbose ............ Print verbose output to stderr
    --list ............... Print connected devices and virtual devices

`

export async function run(args: readonly string[]): Promise<void> {
  process.stdout.write(help)
}
