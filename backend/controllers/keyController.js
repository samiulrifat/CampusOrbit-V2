const CryptoKey = require('../models/CryptoKey');
const { generateManagedKeyBundle } = require('../utils/keymanager');

async function getNextVersion() {
  const latest = await CryptoKey.findOne({}).sort({ version: -1 });
  return latest ? latest.version + 1 : 1;
}

exports.getActivePublicKeys = async (req, res) => {
  try {
    const active = await CryptoKey.findOne({ status: 'active' }).sort({ version: -1 });
    if (!active) {
      return res.status(404).json({ success: false, message: 'No active key version found' });
    }

    if (!active.hasValidMac()) {
      return res.status(400).json({ success: false, message: 'Key integrity check failed' });
    }

    res.json({
      success: true,
      keys: {
        version: active.version,
        rsa: {
          e: active.rsaPublicE,
          n: active.rsaPublicN
        },
        ecc: {
          x: active.eccPublicX,
          y: active.eccPublicY
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active keys', error: error.message });
  }
};

exports.listKeyVersions = async (req, res) => {
  try {
    const versions = await CryptoKey.find({}).sort({ version: -1 });
    const safeVersions = versions.map(entry => ({
      _id: entry._id,
      version: entry.version,
      status: entry.status,
      rotatedAt: entry.rotatedAt,
      rotatedBy: entry.rotatedBy,
      integrityOk: entry.hasValidMac()
    }));
    res.json({ success: true, keyVersions: safeVersions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list key versions', error: error.message });
  }
};

exports.rotateKeys = async (req, res) => {
  try {
    const version = await getNextVersion();
    const seed = Date.now() + version;
    const generated = generateManagedKeyBundle(seed);

    await CryptoKey.updateMany({ status: 'active' }, { $set: { status: 'retired' } });

    const keyVersion = new CryptoKey({
      version,
      status: 'active',
      rsaPublicE: generated.rsaPublicE,
      rsaPublicN: generated.rsaPublicN,
      eccPublicX: generated.eccPublicX,
      eccPublicY: generated.eccPublicY,
      rsaPrivateCipher: generated.rsaPrivateCipher,
      eccPrivateCipher: generated.eccPrivateCipher,
      rotatedBy: req.user.id,
      rotatedAt: new Date()
    });

    await keyVersion.save();
    res.status(201).json({ success: true, message: `Key version ${version} is active`, version });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to rotate keys', error: error.message });
  }
};

exports.bootstrapKeysIfMissing = async () => {
  const existing = await CryptoKey.findOne({});
  if (existing) {
    return;
  }

  const generated = generateManagedKeyBundle(Date.now());
  await CryptoKey.create({
    version: 1,
    status: 'active',
    rsaPublicE: generated.rsaPublicE,
    rsaPublicN: generated.rsaPublicN,
    eccPublicX: generated.eccPublicX,
    eccPublicY: generated.eccPublicY,
    rsaPrivateCipher: generated.rsaPrivateCipher,
    eccPrivateCipher: generated.eccPrivateCipher,
    rotatedAt: new Date()
  });
};