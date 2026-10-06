/**
 * A non-cryptographic checksum, for spotting a damaged file.
 *
 * FNV-1a, 32-bit. Chosen because it is three lines, needs no key, and runs
 * synchronously — `crypto.subtle.digest()` is async, which would make `save()`
 * and the boot-time `load()` promises and ripple through the whole store.
 *
 * **This is not security.** FNV-1a is not collision-resistant and anyone can
 * recompute it, so it detects a truncated or corrupted file and nothing else. It
 * exists so an import can refuse garbage rather than half-loading it. Real signing
 * needs a server-held secret and cannot be done in the browser — see DEC-021 and
 * ISS-032. `verify()` in `state/saveFile.js` is the seam where that lands.
 */

/**
 * @param {string} text
 * @returns {string} 8 lowercase hex characters
 */
export function checksum(text) {
  // 32-bit FNV-1a offset basis and prime, done in unsigned arithmetic.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // hash *= 16777619, kept inside 32 bits without overflowing the float64 mantissa.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Constant-time comparison.
 *
 * Not strictly needed for a checksum, but it costs nothing and means a future
 * signature check in this same position does not introduce a timing side channel
 * by accident. An early return on length would leak the prefix.
 */
export function checksumsMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
