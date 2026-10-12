export function encode(value: unknown): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] ^= 0xa7;
  }
  return bytes;
}

export function decode(bytes: Uint8Array): any {
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] ^= 0xa7;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
