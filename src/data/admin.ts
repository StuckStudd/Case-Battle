/**
 * Admin panel password check. Only a PBKDF2-SHA256 hash of the password is stored here, never the password itself.
 * To change the password, generate a new salt and hash (same parameters) and replace the values below.
 */
const SALT_HEX = '1c4c77230f7ec1b060dc2a48c94b69d8';
const HASH_HEX = '2e01673afaddce5a2fb0b482684fb5a73265df1615bc93a296433b7f5dae0af4';
const ITERATIONS = 310000;

const fromHex = (hex: string) => new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)));

/** Constant-time comparison of two byte arrays. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password || !crypto.subtle) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(SALT_HEX), iterations: ITERATIONS }, key, 256);
  return equal(new Uint8Array(bits), fromHex(HASH_HEX));
}
