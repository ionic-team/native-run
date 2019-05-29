export function sort<T extends any>(obj: T): T {
  const entries = [...Object.entries(obj)];

  entries.sort(([k1], [k2]) => k1.localeCompare(k2));

  for (const [ key ] of entries) {
    delete obj[key];
  }

  for (const [ key, value ] of entries) {
    obj[key] = value;
  }

  return obj;
}
