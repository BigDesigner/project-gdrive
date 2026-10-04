import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createSessionToken,
  verifySessionToken,
  timingSafeEqualStrings,
} from '../functions/api/_auth.js';

const MAGIC = Buffer.from('ENC0');
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const ITERATIONS = 100_000;

test('Auth: Session token oluşturma ve doğrulama', async () => {
  const secret = 'test_super_secret_key_1234567890_abcdef';
  const token = await createSessionToken(secret, 3600);

  assert.ok(token, 'Token üretilmelidir');
  assert.ok(token.includes('.'), 'Token payload ve imzayı içermelidir');

  // Doğru anahtarla doğrula
  const verified = await verifySessionToken(token, secret);
  assert.ok(verified, 'Geçerli token onaylanmalıdır');
  assert.equal(verified.role, 'admin');

  // Hatalı anahtarla doğrula
  const badSecretVerified = await verifySessionToken(token, 'wrong_secret_key');
  assert.equal(badSecretVerified, false, 'Yanlış anahtarla imza geçersiz olmalıdır');

  // Değiştirilmiş token doğrula
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedVerified = await verifySessionToken(tamperedToken, secret);
  assert.equal(tamperedVerified, false, 'Tahrif edilmiş token reddedilmelidir');
});

test('Auth: Timing-safe dize karşılaştırma', async () => {
  const pass = 'Sup3rP@ssw0rd!2026';
  assert.equal(await timingSafeEqualStrings(pass, pass), true);
  assert.equal(await timingSafeEqualStrings(pass, 'Sup3rP@ssw0rd!2027'), false);
  assert.equal(await timingSafeEqualStrings(pass, ''), false);
});

test('Crypto: PBKDF2 AES-256-GCM Şifreleme ve Deşifreleme Roundtrip', async () => {
  const originalPlaintext = Buffer.from('Kritik incident response delil verisi: Memory dump slice #42');
  const password = 'IncidentPassword2026!#';

  // 1. Tarayıcı Web Crypto mantığını simüle eden şifreleme
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(originalPlaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Paketleme: [MAGIC][SALT][IV][CIPHERTEXT + TAG]
  const packageBuffer = Buffer.concat([MAGIC, salt, iv, encrypted, authTag]);

  // 2. scripts/decrypt-tool.js deşifreleme mantığı ile çözme
  assert.equal(packageBuffer.subarray(0, 4).equals(MAGIC), true);
  const readSalt = packageBuffer.subarray(4, 4 + SALT_LEN);
  const readIv = packageBuffer.subarray(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
  const payloadData = packageBuffer.subarray(4 + SALT_LEN + IV_LEN);

  const ciphertext = payloadData.subarray(0, payloadData.length - TAG_LEN);
  const readAuthTag = payloadData.subarray(payloadData.length - TAG_LEN);

  const decKey = crypto.pbkdf2Sync(password, readSalt, ITERATIONS, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', decKey, readIv);
  decipher.setAuthTag(readAuthTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  assert.equal(decrypted.toString(), originalPlaintext.toString(), 'Deşifrelenen veri orijinali ile birebir aynı olmalıdır');
});
