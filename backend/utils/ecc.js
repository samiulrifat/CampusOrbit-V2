const { modInverse, normalizeModulo, toBigInt, gcd } = require('./math');

const CURVE = {
  a: 497n,
  b: 1768n,
  p: 9739n,
  g: { x: 1804n, y: 5368n },
  n: 9735n
};

function infinityPoint() {
  return { infinity: true };
}

function isInfinity(point) {
  return !point || point.infinity === true;
}

function point(x, y) {
  return {
    x: normalizeModulo(x, CURVE.p),
    y: normalizeModulo(y, CURVE.p)
  };
}

function isPointOnCurve(pt) {
  if (isInfinity(pt)) {
    return true;
  }

  const left = normalizeModulo(pt.y * pt.y, CURVE.p);
  const right = normalizeModulo(pt.x * pt.x * pt.x + CURVE.a * pt.x + CURVE.b, CURVE.p);
  return left === right;
}

function pointAdd(p1, p2) {
  if (isInfinity(p1)) return p2;
  if (isInfinity(p2)) return p1;

  if (p1.x === p2.x && normalizeModulo(p1.y + p2.y, CURVE.p) === 0n) {
    return infinityPoint();
  }

  let slope;

  if (p1.x === p2.x && p1.y === p2.y) {
    const denominator = normalizeModulo(2n * p1.y, CURVE.p);
    if (denominator === 0n) {
      return infinityPoint();
    }
    const numerator = normalizeModulo(3n * p1.x * p1.x + CURVE.a, CURVE.p);
    slope = normalizeModulo(numerator * modInverse(denominator, CURVE.p), CURVE.p);
  }
  else {
    const denominator = normalizeModulo(p2.x - p1.x, CURVE.p);
    if (denominator === 0n) {
      return infinityPoint();
    }
    const numerator = normalizeModulo(p2.y - p1.y, CURVE.p);
    slope = normalizeModulo(numerator * modInverse(denominator, CURVE.p), CURVE.p);
  }

  const x3 = normalizeModulo(slope * slope - p1.x - p2.x, CURVE.p);
  const y3 = normalizeModulo(slope * (p1.x - x3) - p1.y, CURVE.p);
  return point(x3, y3);
}

function scalarMultiply(scalar, basePoint = CURVE.g) {
  let k = toBigInt(scalar);
  let result = infinityPoint();
  let current = basePoint;

  while (k > 0n) {
    if (k & 1n) {
      result = pointAdd(result, current);
    }
    current = pointAdd(current, current);
    k >>= 1n;
  }

  return result;
}

function hashMessage(message) {
  const text = String(message);
  let hash = 2166136261n;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = normalizeModulo(hash * 16777619n, CURVE.p);
  }

  return normalizeModulo(hash, CURVE.n - 1n) + 1n;
}

function getEccKeyPair() {
  const privateKey = 1337n;
  const publicKey = scalarMultiply(privateKey, CURVE.g);

  if (!isPointOnCurve(publicKey)) {
    throw new Error('Generated public key is not on the selected curve');
  }

  return { privateKey, publicKey };
}

function generateEccKeyPair(seed = Date.now()) {
  const normalizedSeed = toBigInt(Math.abs(Number(seed)) || 1);
  const privateKey = normalizeModulo(normalizedSeed * 7919n + 1237n, CURVE.n - 1n) + 1n;
  const publicKey = scalarMultiply(privateKey, CURVE.g);

  if (!isPointOnCurve(publicKey)) {
    throw new Error('Generated ECC public key is invalid');
  }

  return { privateKey, publicKey };
}

function eccEncryptText(plainText, publicKey = getEccKeyPair().publicKey, seed = 97n) {
  if (plainText === undefined || plainText === null) {
    return '';
  }

  const text = String(plainText);
  const blocks = [];

  for (let index = 0; index < text.length; index += 1) {
    const charCode = BigInt(text.charCodeAt(index));
    const k = normalizeModulo(BigInt(seed) + BigInt(index + 1) * 97n, CURVE.n - 1n) + 1n;
    const c1 = scalarMultiply(k, CURVE.g);
    const shared = scalarMultiply(k, publicKey);
    const cipherValue = normalizeModulo(charCode + shared.x, 65536n);
    blocks.push(`${c1.x.toString(36)}:${c1.y.toString(36)}:${cipherValue.toString(36)}`);
  }

  return blocks.join('.');
}

function eccDecryptText(cipherText, privateKey = getEccKeyPair().privateKey) {
  if (cipherText === undefined || cipherText === null || cipherText === '') {
    return '';
  }

  const blocks = String(cipherText).split('.').filter(Boolean);
  const chars = blocks.map(block => {
    const [xEnc, yEnc, cEnc] = block.split(':');
    const c1 = point(BigInt(parseInt(xEnc, 36)), BigInt(parseInt(yEnc, 36)));
    const cipherValue = BigInt(parseInt(cEnc, 36));
    const shared = scalarMultiply(toBigInt(privateKey), c1);
    const plainValue = normalizeModulo(cipherValue - shared.x, 65536n);
    return String.fromCharCode(Number(plainValue));
  });

  return chars.join('');
}

function sign(message, privateKey = getEccKeyPair().privateKey) {
  const z = hashMessage(message);
  const d = toBigInt(privateKey);

  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const k = normalizeModulo(z * 1337n + 997n + BigInt(attempt) * 19n, CURVE.n - 1n) + 1n;

      if (gcd(k, CURVE.n) !== 1n) {
        continue;
      }

      const kG = scalarMultiply(k, CURVE.g);
      if (isInfinity(kG)) {
        continue;
      }

      const r = normalizeModulo(kG.x, CURVE.n);
      if (r === 0n) {
        continue;
      }

      const kInverse = modInverse(k, CURVE.n);
      const s = normalizeModulo(kInverse * (z + r * d), CURVE.n);
      if (s === 0n) {
        continue;
      }

      return { r, s };
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Failed to generate valid ECDSA signature after 100 attempts');
}

function verify(message, signature, publicKey = getEccKeyPair().publicKey) {
  if (!signature || signature.r === undefined || signature.s === undefined) {
    return false;
  }

  const r = toBigInt(signature.r);
  const s = toBigInt(signature.s);

  if (r <= 0n || r >= CURVE.n || s <= 0n || s >= CURVE.n) {
    return false;
  }

  if (!isPointOnCurve(publicKey)) {
    return false;
  }

  const z = hashMessage(message);
  const w = modInverse(s, CURVE.n);
  const u1 = normalizeModulo(z * w, CURVE.n);
  const u2 = normalizeModulo(r * w, CURVE.n);
  const u1G = scalarMultiply(u1, CURVE.g);
  const u2Q = scalarMultiply(u2, publicKey);
  const resultPoint = pointAdd(u1G, u2Q);

  if (isInfinity(resultPoint)) {
    return false;
  }

  return normalizeModulo(resultPoint.x, CURVE.n) === r;
}

module.exports = {
  CURVE,
  eccDecryptText,
  eccEncryptText,
  generateEccKeyPair,
  getEccKeyPair,
  hashMessage,
  isInfinity,
  isPointOnCurve,
  pointAdd,
  scalarMultiply,
  sign,
  verify
};
