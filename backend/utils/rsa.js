const { gcd, modInverse, modPow, toBigInt } = require('./math');

const PRIME_POOL = [
	313n, 331n, 337n, 347n, 353n, 359n, 367n, 373n,
	379n, 383n, 389n, 397n, 401n, 409n, 419n, 421n,
	431n, 433n, 439n, 443n, 449n, 457n, 461n, 463n
];

const RSA_PRIME_P = 383n;
const RSA_PRIME_Q = 503n;
const RSA_N = RSA_PRIME_P * RSA_PRIME_Q;
const RSA_PHI = (RSA_PRIME_P - 1n) * (RSA_PRIME_Q - 1n);
const RSA_E = 65537n;
const RSA_D = modInverse(RSA_E, RSA_PHI);

function choosePublicExponent(phi) {
	const candidates = [65537n, 257n, 17n, 5n, 3n];
	for (const candidate of candidates) {
		if (candidate < phi && gcd(candidate, phi) === 1n) {
			return candidate;
		}
	}
	throw new Error('No valid public exponent found for generated phi(n)');
}

function generateRsaKeyPair(seed = Date.now()) {
	const normalizedSeed = Number(seed);
	const pIndex = Math.abs(normalizedSeed) % PRIME_POOL.length;
	const qIndex = (Math.abs(normalizedSeed * 7) + 11) % PRIME_POOL.length;
	let p = PRIME_POOL[pIndex];
	let q = PRIME_POOL[qIndex];
	
	if (p === q) {
		q = PRIME_POOL[(qIndex + 1) % PRIME_POOL.length];
	}
	
	const n = p * q;
	
	const phi = (p - 1n) * (q - 1n);
	
	const e = choosePublicExponent(phi);
	
	const d = modInverse(e, phi);
	
	return {
		publicKey: { e, n },
		privateKey: { d, n }
	};
}

function getRsaKeyPair() {
	return {
		publicKey: { e: RSA_E, n: RSA_N },
		privateKey: { d: RSA_D, n: RSA_N }
	};
}

function validateRsaParameters() {
	return gcd(RSA_E, RSA_PHI) === 1n;
}

function encryptNumber(messageNumber, publicKey = getRsaKeyPair().publicKey) {
	return modPow(toBigInt(messageNumber), publicKey.e, publicKey.n);
}

function decryptNumber(cipherNumber, privateKey = getRsaKeyPair().privateKey) {
	return modPow(toBigInt(cipherNumber), privateKey.d, privateKey.n);
}

function encryptText(plainText, publicKey = getRsaKeyPair().publicKey) {
	if (plainText === undefined || plainText === null) {
		return '';
	}

	const blocks = [];
	const text = String(plainText);

	for (let index = 0; index < text.length; index += 1) {
		const codePoint = BigInt(text.charCodeAt(index));
		const encrypted = encryptNumber(codePoint, publicKey);
		blocks.push(encrypted.toString(36));
	}

	return blocks.join('.');
}

function decryptText(cipherText, privateKey = getRsaKeyPair().privateKey) {
	if (cipherText === undefined || cipherText === null || cipherText === '') {
		return '';
	}

	const blocks = String(cipherText).split('.').filter(Boolean);
	const chars = blocks.map(block => {
		const encrypted = BigInt(parseInt(block, 36));
		const decrypted = decryptNumber(encrypted, privateKey);
		return String.fromCharCode(Number(decrypted));
	});

	return chars.join('');
}

module.exports = {
	RSA_D,
	RSA_E,
	RSA_N,
	decryptNumber,
	decryptText,
	encryptNumber,
	encryptText,
	generateRsaKeyPair,
	getRsaKeyPair,
	validateRsaParameters
};
