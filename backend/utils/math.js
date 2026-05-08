function toBigInt(value) {
	return typeof value === 'bigint' ? value : BigInt(value);
}

function normalizeModulo(value, modulus) {
	const mod = toBigInt(modulus);
	const normalized = toBigInt(value) % mod;
	return normalized >= 0n ? normalized : normalized + mod;
}

function gcd(a, b) {
	let x = toBigInt(a);
	let y = toBigInt(b);

	while (y !== 0n) {
		const temp = y;
		y = x % y;
		x = temp;
	}

	return x < 0n ? -x : x;
}

function extendedGcd(a, b) {
	let oldR = toBigInt(a);
	let r = toBigInt(b);
	let oldS = 1n;
	let s = 0n;
	let oldT = 0n;
	let t = 1n;

	while (r !== 0n) {
		const quotient = oldR / r;
		[oldR, r] = [r, oldR - quotient * r];
		[oldS, s] = [s, oldS - quotient * s];
		[oldT, t] = [t, oldT - quotient * t];
	}

	return { gcd: oldR, x: oldS, y: oldT };
}

function modInverse(value, modulus) {
	const mod = toBigInt(modulus);
	const { gcd: result, x } = extendedGcd(normalizeModulo(value, mod), mod);

	if (result !== 1n && result !== -1n) {
		throw new Error('Modular inverse does not exist');
	}

	return normalizeModulo(x, mod);
}

function modPow(base, exponent, modulus) {
	const mod = toBigInt(modulus);
	let result = 1n;
	let power = normalizeModulo(base, mod);
	let remaining = toBigInt(exponent);

	if (mod === 1n) {
		return 0n;
	}

	while (remaining > 0n) {
		if (remaining & 1n) {
			result = (result * power) % mod;
		}

		remaining >>= 1n;
		power = (power * power) % mod;
	}

	return result;
}

module.exports = {
	gcd,
	modInverse,
	modPow,
	normalizeModulo,
	toBigInt
};
