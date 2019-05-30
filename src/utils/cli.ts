export function getOptionValue(args: ReadonlyArray<string>, arg: string): string | undefined;
export function getOptionValue(args: ReadonlyArray<string>, arg: string, defaultValue: string): string;
export function getOptionValue(args: ReadonlyArray<string>, arg: string, defaultValue?: string): string | undefined {
  const i = args.indexOf(arg);

  if (i >= 0) {
    return args[i + 1];
  }

  return defaultValue;
}

export function getOptionValues(args: ReadonlyArray<string>, arg: string): string[] {
  const returnVal: string[] = [];
  args.map((entry: string, idx: number) => {
    if (entry === arg) {
      returnVal.push(args[idx + 1]);
    }
  });
  return returnVal;
}
