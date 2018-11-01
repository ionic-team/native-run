export async function wait(milliseconds: number) {
  return new Promise(r => setTimeout(r, milliseconds));
}
