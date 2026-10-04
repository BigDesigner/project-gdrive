#!/usr/bin/env node
/**
 * Google Drive OAuth 2.0 Refresh Token Alıcı Yardımcı Scripti
 * Sıfır bağımlılık (Pure Node.js http + readline)
 * 
 * Kullanım:
 *   node scripts/get-refresh-token.js
 */

import http from 'node:http';
import readline from 'node:readline';
import { exec } from 'node:child_process';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';

function openBrowser(url) {
  const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${start} "${url}"`, (err) => {
    if (err) {
      console.log('\nTarayıcı otomatik açılamadı. Lütfen şu bağlantıyı tarayıcınızda açın:');
      console.log(url);
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n======================================================');
  console.log('⚡ Google Drive OAuth 2.0 Refresh Token Alıcı Aracı');
  console.log('======================================================\n');
  console.log('Ön Hazırlık:');
  console.log('1. Google Cloud Console (https://console.cloud.google.com) adresine gidin.');
  console.log('2. Ücretsiz bir proje oluşturup "Google Drive API"yi etkinleştirin.');
  console.log('3. "APIs & Services > Credentials" bölümünden "Create Credentials > OAuth client ID" seçin.');
  console.log('4. Application Type olarak "Web application" seçin.');
  console.log(`5. "Authorized redirect URIs" alanına şunu ekleyin: ${REDIRECT_URI}\n`);

  const clientId = (await ask('Google Client ID: ')).trim();
  const clientSecret = (await ask('Google Client Secret: ')).trim();

  if (!clientId || !clientSecret) {
    console.error('\nHata: Client ID ve Client Secret boş bırakılamaz.');
    rl.close();
    process.exit(1);
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname === '/oauth2callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h2>Yetkilendirme Hatası: ${error}</h2>`);
          console.error(`\nYetkilendirme iptal edildi veya hata oluştu: ${error}`);
          server.close();
          rl.close();
          process.exit(1);
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:40px; text-align:center;">
                <h1 style="color:#10b981;">Yetkilendirme Başarılı!</h1>
                <p>Refresh token terminalinize yazdırıldı. Bu pencereyi kapatabilirsiniz.</p>
              </body>
            </html>
          `);

          console.log('\nKod alındı, token talep ediliyor...');

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: REDIRECT_URI,
              grant_type: 'authorization_code'
            })
          });

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            console.error('\nToken alınırken hata oluştu:', tokenData.error_description || tokenData.error);
          } else {
            console.log('\n======================================================');
            console.log('✅ REFRESH TOKEN BAŞARIYLA ALINDI!');
            console.log('======================================================\n');
            console.log(`GDRIVE_REFRESH_TOKEN=${tokenData.refresh_token}\n`);
            console.log('Bu değeri ve Client ID / Secret bilgilerinizi .env dosyanıza veya');
            console.log('Cloudflare Pages Environment Variables paneline ekleyin.\n');
          }

          server.close();
          rl.close();
          process.exit(0);
        }
      }
    } catch (err) {
      console.error('\nSunucu hatası:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Sunucu hatası');
    }
  });

  server.listen(PORT, () => {
    console.log(`\nYetkilendirme için tarayıcı açılıyor: ${authUrl}\n`);
    openBrowser(authUrl);
  });
}

main().catch(console.error);
