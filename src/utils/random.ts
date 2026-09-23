const TWO_POW_21 = 2 ** 21;
const TWO_POW_53 = 2 ** 53;

/** Uniform float in [0, 1) with 53 bits of entropy from the Web Crypto API (falls back to Math.random). */
export function secureRandom(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const buf = new Uint32Array(2);
    cryptoApi.getRandomValues(buf);
    return (buf[0] * TWO_POW_21 + (buf[1] >>> 11)) / TWO_POW_53;
  }
  return Math.random();
}

/** Integer in [min, maxExclusive). */
export function randomInt(min: number, maxExclusive: number): number {
  return min + Math.floor(secureRandom() * (maxExclusive - min));
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length)];
}

export function createId(prefix = 'id'): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}_${cryptoApi.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(secureRandom() * 1e12).toString(36)}`;
}
