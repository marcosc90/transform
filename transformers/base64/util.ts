export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const tmp = new Uint8Array(a.length + b.length);
  tmp.set(a, 0);
  tmp.set(b, a.length);
  return tmp;
}
