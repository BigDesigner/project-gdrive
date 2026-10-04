/**
 * Google Drive API v3 & Webhook Yardımcı Modülü
 */

// Google OAuth Access Token Al
export async function getGoogleAccessToken(env) {
  const { GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN } = env;

  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET || !GDRIVE_REFRESH_TOKEN) {
    throw new Error(
      'Google Drive kimlik bilgileri eksik. Lütfen GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET ve GDRIVE_REFRESH_TOKEN değişkenlerini tanımlayın.'
    );
  }

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GDRIVE_CLIENT_ID,
      client_secret: GDRIVE_CLIENT_SECRET,
      refresh_token: GDRIVE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenResp.json();
  if (tokenData.error) {
    throw new Error(`Google Token Yenileme Hatası: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

// Depolama Kotası ve Kullanıcı Bilgisi Çek
export async function getDriveStorageQuota(accessToken) {
  const resp = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(displayName,emailAddress)',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google Drive kota bilgisi alınamadı: ${err}`);
  }

  return await resp.json();
}

// Google Drive'a Dosya Yükle (Resumable Upload Akışı)
export async function uploadToGoogleDrive({
  accessToken,
  fileName,
  mimeType,
  fileBytes,
  folderId,
  description,
}) {
  const metadata = {
    name: fileName,
    description: description || 'Uploaded via Rescue Vault',
  };

  if (folderId && folderId.trim()) {
    metadata.parents = [folderId.trim()];
  }

  // 1. Resumable Upload Başlat
  const initResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,size,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': fileBytes.byteLength.toString(),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResp.ok) {
    const errorText = await initResp.text();
    throw new Error(`Google Drive yükleme oturumu başlatılamadı: ${errorText}`);
  }

  const uploadUrl = initResp.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive geçerli bir upload oturum adresi (Location) dönmedi.');
  }

  // 2. Dosya Verisini Gönder (Binary Stream)
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': fileBytes.byteLength.toString(),
      'Content-Type': mimeType || 'application/octet-stream',
    },
    body: fileBytes,
  });

  if (!uploadResp.ok) {
    const uploadErr = await uploadResp.text();
    throw new Error(`Dosya Google Drive'a aktarılamadı: ${uploadErr}`);
  }

  return await uploadResp.json();
}

// Discord Webhook Bildirimi
export async function sendDiscordAlert(webhookUrl, data) {
  if (!webhookUrl || !webhookUrl.startsWith('https://')) return;

  const { fileName, name, sizeFormatted, sha256, isEncrypted, encPassword, driveLink, webViewLink, clientIp } = data;
  const resolvedFileName = fileName || name || 'Bilinmeyen Dosya';
  const resolvedLink = driveLink || webViewLink || null;

  const fields = [
    { name: '📄 Dosya Adı', value: `\`${resolvedFileName}\``, inline: true },
    { name: '📦 Boyut', value: sizeFormatted, inline: true },
    { name: '🔒 Şifreleme', value: isEncrypted ? '✅ AES-256-GCM (Zero-Knowledge)' : '❌ Ham (Düz Veri)', inline: true },
    { name: '🛡️ Delil SHA-256', value: `\`\`\`${sha256}\`\`\``, inline: false },
  ];

  if (isEncrypted && encPassword) {
    fields.push({
      name: '🔑 Deşifre Parolası',
      value: `||${encPassword}||`,
      inline: false,
    });
  }

  fields.push({
    name: '🔗 Google Drive',
    value: resolvedLink ? `[Dosyayı Görüntüle](${resolvedLink})` : 'Klasörde Mevcut',
    inline: false,
  });

  const payload = {
    username: 'Rescue Vault [Blue Team]',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/2092/2092663.png',
    embeds: [
      {
        title: '🚨 Rescue Vault: Yeni Dosya Yedeklendi',
        color: isEncrypted ? 0x10b981 : 0x00f0ff, // Yeşil (Şifreli) / Mavi
        fields,
        footer: {
          text: `IP: ${clientIp || 'Gizli'} • ${new Date().toISOString()}`,
        },
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Discord webhook hatası:', e.message);
  }
}

// Telegram Bot Bildirimi
export async function sendTelegramAlert(botToken, chatId, data) {
  if (!botToken || !chatId) return;

  const { fileName, name, sizeFormatted, sha256, isEncrypted, encPassword, driveLink, webViewLink } = data;
  const resolvedFileName = fileName || name || 'Bilinmeyen Dosya';
  const resolvedLink = driveLink || webViewLink || null;

  let text =
    `🚨 *Rescue Vault: Yeni Dosya Yüklendi*\n\n` +
    `📄 *Dosya:* \`${resolvedFileName}\`\n` +
    `📦 *Boyut:* ${sizeFormatted}\n` +
    `🔒 *Şifreleme:* ${isEncrypted ? '✅ AES-256-GCM' : '❌ Yok'}\n`;

  if (isEncrypted && encPassword) {
    text += `🔑 *Deşifre Parolası:* ||${encPassword}||\n`;
  }

  text +=
    `🛡️ *SHA-256:* \`${sha256}\`\n` +
    (resolvedLink ? `🔗 [Google Drive Bağlantısı](${resolvedLink})\n` : '') +
    `⏱️ *Zaman:* ${new Date().toISOString()}`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error('Telegram bot hatası:', e.message);
  }
}
