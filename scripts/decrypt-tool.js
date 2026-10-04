#!/usr/bin/env node
/**
 * Zero-Knowledge AES-256-GCM Offline Deşifreleme Aracı
 * Sıfır harici bağımlılık (Pure Node.js crypto & fs)
 * 
 * Kullanım:
 *   node scripts/decrypt-tool.js --file <dosya.enc> --password <parola> [--output <cikti_dosyasi>]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const MAGIC = Buffer.from('ENC0'); // 4 bytes magic
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const ITERATIONS = 100_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      params.file = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      params.password = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      params.output = args[++i];
    }
  }
  return params;
}

async function main() {
  const { file, password, output } = parseArgs();

  if (!file || !password) {
    console.log('\nKullanım: node scripts/decrypt-tool.js --file <dosya.enc> --password <parola> [--output <cikti_dosyasi>]');
    process.exit(1);
  }

  try {
    const rawData = await fs.readFile(file);
    if (rawData.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
      throw new Error('Dosya geçerli bir Rescue Vault şifreli paketi değil (çok kısa).');
    }

    const magic = rawData.subarray(0, 4);
    if (!magic.equals(MAGIC)) {
      throw new Error('Geçersiz dosya formatı. Başlık "ENC0" magic baytlarını içermiyor.');
    }

    const salt = rawData.subarray(4, 4 + SALT_LEN);
    const iv = rawData.subarray(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
    const encryptedData = rawData.subarray(4 + SALT_LEN + IV_LEN);

    // Web Crypto AES-GCM auth tag is at the last 16 bytes of the ciphertext
    const ciphertext = encryptedData.subarray(0, encryptedData.length - TAG_LEN);
    const authTag = encryptedData.subarray(encryptedData.length - TAG_LEN);

    console.log(`\nAnahtar türetiliyor (PBKDF2 SHA-256, ${ITERATIONS} iterasyon)...`);
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

    console.log('AES-256-GCM ile deşifre ediliyor...');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    let targetPath = output;
    if (!targetPath) {
      if (file.endsWith('.enc')) {
        targetPath = file.slice(0, -4);
      } else {
        targetPath = file + '.decrypted';
      }
    }

    await fs.writeFile(targetPath, decrypted);
    console.log(`\n✅ Başarıyla deşifre edildi!`);
    console.log(`Dosya kaydedildi: ${path.resolve(targetPath)} (${decrypted.length} bayt)\n`);
  } catch (err) {
    console.error(`\n❌ Deşifreleme hatası: ${err.message}`);
    console.error('Lütfen parolanın doğru olduğundan ve dosyanın bozulmadığından emin olun.\n');
    process.exit(1);
  }
}

main().catch(console.error);
