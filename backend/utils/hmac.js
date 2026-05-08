function toCodePoints(input) {
  return Array.from(String(input || ''), ch => ch.charCodeAt(0));
}

function simpleHash(input) {
  const data = toCodePoints(input);
  let h1 = 0x6a09e667;
  let h2 = 0xbb67ae85;

  for (let i = 0; i < data.length; i += 1) {
    const value = data[i];
    h1 = (h1 ^ value) >>> 0;
    h1 = Math.imul(h1, 0x45d9f3b) >>> 0;
    h2 = (h2 + ((value << (i % 8)) >>> 0)) >>> 0;
    h2 = Math.imul(h2 ^ h1, 0x27d4eb2d) >>> 0;
  }

  const combined = ((BigInt(h1) << 32n) | BigInt(h2)).toString(16);
  return combined.padStart(16, '0');
}

function normalizeKey(key, size) {
  const keyData = toCodePoints(key);
  const normalized = new Array(size).fill(0);
  for (let i = 0; i < size; i += 1) {
    normalized[i] = keyData[i % keyData.length] || 0;
  }
  return normalized;
}

function hmac(message, key) {
  const blockSize = 64;
  const secret = String(key || 'campusorbit-default-mac-key');
  const keyBytes = normalizeKey(secret, blockSize);
  const innerPad = keyBytes.map(byte => byte ^ 0x36);
  const outerPad = keyBytes.map(byte => byte ^ 0x5c);
  const inner = simpleHash(`${String.fromCharCode(...innerPad)}${String(message || '')}`);
  const outer = simpleHash(`${String.fromCharCode(...outerPad)}${inner}`);
  return outer;
}

module.exports = {
  hmac,
  simpleHash
};