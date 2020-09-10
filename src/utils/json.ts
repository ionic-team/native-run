export function stringify(obj: any): string {
  return JSON.stringify(
    obj,
    (k, v) => (v instanceof RegExp ? v.toString() : v),
    '\t',
  );
}
