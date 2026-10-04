/**
 * Global API Middleware
 * Güvenlik başlıklarını (Security Headers) ve hata yönetimini sağlar.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/gdrive\.gnn\.tr$/,
  /^https:\/\/gdrive-frontend\.pages\.dev$/,
  /^https:\/\/.*\.pages\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = new Headers();
  if (origin && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export async function onRequest(context) {
  const corsHeaders = getCorsHeaders(context.request);

  // OPTIONS preflight kontrolü
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const response = await context.next();
    const newHeaders = new Headers(response.headers);

    for (const [key, val] of corsHeaders.entries()) {
      newHeaders.set(key, val);
    }

    // Temel Güvenlik Başlıkları
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('X-XSS-Protection', '1; mode=block');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Sunucu hatası oluştu',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}
