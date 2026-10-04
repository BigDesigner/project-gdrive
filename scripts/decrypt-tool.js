#!/usr/bin/env node
/**
 * Zero-Knowledge AES-256-GCM Offline Deşifreleme Aracı
 * Sıfır harici bağımlılık (Pure Node.js crypto, fs, readline, child_process)
 * 
 * Kullanım:
 *   1. Etkileşimli (CMD / Çift Tıklama / Sürükle-Bırak):
 *      node scripts/decrypt-tool.js
 *      node scripts/decrypt-tool.js "dosya.enc"
 *   2. Argümanlı (Otomasyon / CLI):
 *      node scripts/decrypt-tool.js --file <dosya.enc> --password <parola> [--output <cikti>]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { execSync } from 'node:child_process';

const MAGIC = Buffer.from('ENC0'); // 4 bayt magic
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
    } else if (!params.file && !args[i].startsWith('--')) {
      // Sürükle-bırak veya ilk konumsal parametre dosya yoludur
      params.file = args[i];
    }
  }
  return params;
}

function cleanFilePath(raw) {
  if (!raw) return '';
  let clean = raw.trim();
  // Windows CMD sürükle-bırak tırnaklarını temizle
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  return clean.trim();
}

function openWindowsFileDialog() {
  try {
    const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Şifreli Dosyalar (*.enc)|*.enc|Tüm Dosyalar (*.*)|*.*'; $f.Title = 'Deşifre Edilecek Dosyayı Seçin'; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.FileName }"`;
    const selected = execSync(psCmd, { encoding: 'utf-8' }).trim();
    return selected || null;
  } catch {
    return null;
  }
}

async function askQuestion(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askPassword(promptText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Piped veya non-interactive oturumlarda fallback
      askQuestion(promptText).then(resolve);
      return;
    }

    process.stdout.write(promptText);
    const stdin = process.stdin;
    const oldRawMode = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(oldRawMode || false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C ile çıkış
        process.stdout.write('\nİşlem iptal edildi.\n');
        process.exit(1);
      } else if (char === '\u007f' || char === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const params = parseArgs();

  // Etkileşimli karşılama başlığı
  if (!params.file || !params.password) {
    console.log('\n======================================================');
    console.log('🔒 RESCUE VAULT - OFFLINE DOSYA DEŞİFRELEYİCİ');
    console.log('======================================================\n');
  }

  // 1. Dosya Yolunu Belirle
  let filePath = cleanFilePath(params.file);

  if (!filePath) {
    console.log('Deşifre edilecek .enc dosyasını bu pencereye sürükleyip bırakın');
    console.log('(veya dosya seçim penceresi açmak için doğrudan ENTER\'a basın):');
    const input = await askQuestion('\nDosya: ');
    filePath = cleanFilePath(input);

    if (!filePath && process.platform === 'win32') {
      console.log('\nDosya seçim penceresi açılıyor...');
      filePath = openWindowsFileDialog();
    }
  }

  if (!filePath) {
    console.error('\n❌ Hata: Hiçbir dosya seçilmedi.');
    process.exit(1);
  }

  try {
    await fs.access(filePath);
  } catch {
    console.error(`\n❌ Hata: Dosya bulunamadı: "${filePath}"`);
    process.exit(1);
  }

  console.log(`\n📄 Seçilen Dosya: ${filePath}`);

  // 2. Parolayı Al
  let password = params.password;
  if (!password) {
    password = await askPassword('🔑 Deşifreleme Parolası: ');
    if (!password) {
      console.error('\n❌ Hata: Parola boş bırakılamaz.');
      process.exit(1);
    }
  }

  // 3. Deşifreleme İşlemi
  try {
    const rawData = await fs.readFile(filePath);
    if (rawData.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
      throw new Error('Dosya geçerli bir Rescue Vault şifreli paketi değil (boyut çok küçük).');
    }

    const magic = rawData.subarray(0, 4);
    if (!magic.equals(MAGIC)) {
      throw new Error('Geçersiz dosya formatı. Başlık "ENC0" magic baytlarını içermiyor.');
    }

    const salt = rawData.subarray(4, 4 + SALT_LEN);
    const iv = rawData.subarray(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
    const encryptedData = rawData.subarray(4 + SALT_LEN + IV_LEN);

    // Web Crypto AES-GCM auth tag, şifreli metnin son 16 baytında yer alır
    const ciphertext = encryptedData.subarray(0, encryptedData.length - TAG_LEN);
    const authTag = encryptedData.subarray(encryptedData.length - TAG_LEN);

    console.log(`\n⏳ Anahtar türetiliyor (PBKDF2-SHA256, ${ITERATIONS.toLocaleString()} iterasyon)...`);
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

    console.log('🔓 AES-256-GCM ile deşifre ediliyor...');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    let targetPath = params.output;
    if (!targetPath) {
      if (filePath.endsWith('.enc')) {
        targetPath = filePath.slice(0, -4);
      } else {
        targetPath = filePath + '.decrypted';
      }
    }

    await fs.writeFile(targetPath, decrypted);
    console.log(`\n======================================================`);
    console.log(`✅ BAŞARIYLA DEŞİFRE EDİLDİ!`);
    console.log(`======================================================`);
    console.log(`📁 Kaydedilen Dosya: ${path.resolve(targetPath)}`);
    console.log(`📊 Dosya Boyutu: ${(decrypted.length / 1024).toFixed(2)} KB (${decrypted.length} bayt)\n`);
  } catch (err) {
    console.error(`\n======================================================`);
    console.error(`❌ DEŞİFRELEME BAŞARISIZ OLDU`);
    console.error(`======================================================`);
    console.error(`Hata: ${err.message}`);
    console.error(`Lütfen parolanın doğru olduğundan ve dosyanın tahrif edilmediğinden emin olun.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nBeklenmeyen hata:', err);
  process.exit(1);
});
