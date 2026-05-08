const {
	decryptText: rsaDecryptText,
	encryptText: rsaEncryptText,
	generateRsaKeyPair,
	getRsaKeyPair
} = require('./rsa');
const {
	eccDecryptText,
	eccEncryptText,
	generateEccKeyPair,
	getEccKeyPair,
	sign,
	verify
} = require('./ecc');
const { hmac } = require('./hmac');

const rsaKeyPair = getRsaKeyPair();
const eccKeyPair = getEccKeyPair();

function encryptText(value) {
	return rsaEncryptText(value);
}

function decryptText(value) {
	return rsaDecryptText(value);
}

function signPayload(payload) {
	return sign(payload, eccKeyPair.privateKey);
}

function verifyPayload(payload, signature) {
	return verify(payload, signature, eccKeyPair.publicKey);
}

function buildEncryptedDataMac(parts) {
	const data = Array.isArray(parts) ? parts.join('|') : String(parts || '');
	return hmac(data, process.env.DATA_MAC_KEY || 'campusorbit-data-mac-key');
}

function verifyEncryptedDataMac(parts, mac) {
	const expected = buildEncryptedDataMac(parts);
	if (!mac || expected.length !== String(mac).length) {
		return false;
	}

	let diff = 0;
	for (let i = 0; i < expected.length; i += 1) {
		diff |= expected.charCodeAt(i) ^ String(mac).charCodeAt(i);
	}

	return diff === 0;
}

function generateManagedKeyBundle(seed = Date.now()) {
	const rsaPair = generateRsaKeyPair(seed);
	const eccPair = generateEccKeyPair(seed);

	const rsaPrivatePayload = JSON.stringify({
		d: rsaPair.privateKey.d.toString(),
		n: rsaPair.privateKey.n.toString()
	});
	const eccPrivatePayload = JSON.stringify({
		privateKey: eccPair.privateKey.toString()
	});

	const rsaPrivateCipher = eccEncryptText(
		rsaPrivatePayload,
		eccKeyPair.publicKey,
		BigInt(Math.abs(Number(seed)) || 1)
	);
	const eccPrivateCipher = rsaEncryptText(eccPrivatePayload, rsaKeyPair.publicKey);

	return {
		rsaPublicE: rsaPair.publicKey.e.toString(),
		rsaPublicN: rsaPair.publicKey.n.toString(),
		eccPublicX: eccPair.publicKey.x.toString(),
		eccPublicY: eccPair.publicKey.y.toString(),
		rsaPrivateCipher,
		eccPrivateCipher
	};
}

function exportPublicKeys() {
	return {
		rsa: rsaKeyPair.publicKey,
		ecc: eccKeyPair.publicKey
	};
}

module.exports = {
	decryptText,
	eccKeyPair,
	encryptText,
	exportPublicKeys,
	buildEncryptedDataMac,
	generateManagedKeyBundle,
	rsaKeyPair,
	signPayload,
	verifyEncryptedDataMac,
	verifyPayload
};
