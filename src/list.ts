export async function run(args: readonly string[]): Promise<void> {
  const [iosOutput, androidOutput] = await Promise.all([
    import('./ios/list').then(iosList => iosList.list(args)),
    import('./android/list').then(androidList => androidList.list(args)),
  ]);

  if (!args.includes('--json')) {
    process.stdout.write(`iOS\n---\n\n${iosOutput}\n`);
    process.stdout.write(`Android\n-------\n\n${androidOutput}`);
  } else {
    const adjustLines = (output: string) => output.split('\n').map(line => `\t${line}`).join('\n').trim();
    process.stdout.write(`
{
\t"ios": ${adjustLines(iosOutput)},
\t"android": ${adjustLines(androidOutput)}
}`
    );
  }
}
