import { extractToken, verifySessionToken } from './_auth.js';
import { getGoogleAccessToken, getDriveStorageQuota } from './_gdrive.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Oturum Kontrolü
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
      JSON.stringify({ success: false, error: 'Oturum süresi dolmuş veya geçersiz.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Sistem & Drive Durumu
  const status = {
    authenticated: true,
    integrations: {
      discord: Boolean(env.DISCORD_WEBHOOK_URL),
      telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      targetFolderConfigured: Boolean(env.GDRIVE_FOLDER_ID),
    },
    googleDriveConfigured: Boolean(
      env.GDRIVE_CLIENT_ID && env.GDRIVE_CLIENT_SECRET && env.GDRIVE_REFRESH_TOKEN
    ),
    storageQuota: null,
    account: null,
  };

  if (status.googleDriveConfigured) {
    try {
      const accessToken = await getGoogleAccessToken(env);
      const about = await getDriveStorageQuota(accessToken);

      const limit = Number(about.storageQuota?.limit || 16106127360); // Varsayılan 15GB
      const usage = Number(about.storageQuota?.usage || 0);
      const free = Math.max(0, limit - usage);
      const percentUsed = limit > 0 ? Math.min(100, (usage / limit) * 100) : 0;

      status.storageQuota = {
        limitBytes: limit,
        usageBytes: usage,
        freeBytes: free,
        limitFormatted: (limit / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        usageFormatted: (usage / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        freeFormatted: (free / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        percentUsed: percentUsed.toFixed(1),
      };

      status.account = {
        name: about.user?.displayName || 'Google Kullanıcısı',
        email: about.user?.emailAddress || 'Gizli',
      };
    } catch (err) {
      status.driveError = err.message;
    }
  }

  return new Response(JSON.stringify({ success: true, data: status }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
