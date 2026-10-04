import { extractToken, verifySessionToken } from './_auth.js';
import {
  getGoogleAccessToken,
  uploadToGoogleDrive,
  sendDiscordAlert,
  sendTelegramAlert,
} from './_gdrive.js';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB Cloudflare Workers Free Limit

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function sanitizeFileName(name) {
  if (!name) return 'rescue_artifact_' + Date.now();
  // Kontrol karakterlerini ve null baytları temizle
  let clean = name.replace(/[\x00-\x1F\x7F]/g, '').trim();
  // Tehlikeli yol ayraçlarını temizle
  clean = clean.replace(/[/\\?%*:|"<>]/g, '_');
  return clean || 'rescue_artifact_' + Date.now();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Yetki Kontrolü
  const token = extractToken(request);
  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await verifySessionToken(token, env.JWT_SECRET);
  if (!session) {
    return new Response(
      JSON.stringify({ success: false, error: 'Geçersiz veya süresi dolmuş oturum.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. 100 MB Gövde Sınırı Kontrolü
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Dosya boyutu Cloudflare limitini (100 MB) aşıyor: ${formatBytes(parseInt(contentLength, 10))}`,
      }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 3. Form Data Ayrıştırma
    const formData = await request.formData();
    const file = formData.get('file');
    const sha256 = (formData.get('sha256') || 'UNKNOWN').toString().trim();
    const headerPass = request.headers.get('x-encryption-password')
      ? decodeURIComponent(request.headers.get('x-encryption-password'))
      : '';
    const formPass = formData.get('encPassword') ? formData.get('encPassword').toString().trim() : '';
    const encPassword = formPass || headerPass;

    if (!file || typeof file === 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Geçerli bir dosya gönderilmedi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileBytes = await file.arrayBuffer();
    if (fileBytes.byteLength > MAX_UPLOAD_BYTES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Dosya boyutu 100 MB limitini aşıyor (${formatBytes(fileBytes.byteLength)}).`,
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fileName = sanitizeFileName(file.name);
    const mimeType = file.type || 'application/octet-stream';
    const clientIp = request.headers.get('cf-connecting-ip') || 'Bilinmiyor';

    // 4. Adli Açıklama Hazırlama
    const description = [
      '--- RESCUE VAULT INCIDENT ARTIFACT ---',
      `Timestamp (UTC): ${new Date().toISOString()}`,
      `Evidence SHA-256: ${sha256}`,
      `Zero-Knowledge AES: ${isEncrypted ? 'ENABLED (AES-256-GCM)' : 'DISABLED (Plain)'}`,
      `Size: ${formatBytes(fileBytes.byteLength)} (${fileBytes.byteLength} bytes)`,
      `Ingested from IP: ${clientIp}`,
    ].join('\n');

    // 5. Google Drive API Akışı
    const accessToken = await getGoogleAccessToken(env);
    const driveResult = await uploadToGoogleDrive({
      accessToken,
      fileName,
      mimeType,
      fileBytes,
      folderId: env.GDRIVE_FOLDER_ID,
      description,
    });

    const filePayload = {
      id: driveResult.id,
      name: fileName,
      fileName,
      size: fileBytes.byteLength,
      sizeFormatted: formatBytes(fileBytes.byteLength),
      driveLink: driveResult.webViewLink || null,
      webViewLink: driveResult.webViewLink || null,
      sha256,
      isEncrypted,
      encPassword,
      uploadedAt: new Date().toISOString(),
      clientIp,
    };

    // 6. Asenkron Non-Blocking Webhook Bildirimleri (context.waitUntil)
    const alertPromise = Promise.all([
      sendDiscordAlert(env.DISCORD_WEBHOOK_URL, filePayload),
      sendTelegramAlert(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, filePayload),
    ]);

    if (context.waitUntil) {
      context.waitUntil(alertPromise);
    } else {
      // Yerel test ortamı desteği
      alertPromise.catch((e) => console.error('Webhook hatası:', e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dosya Google Drive hesabına başarıyla yüklendi.',
        file: filePayload,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Yükleme başarısız oldu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
