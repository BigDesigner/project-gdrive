/**
 * Oturum Yönetimi ve Kriptografik Yardımcılar
 * Web Crypto API kullanarak sıfır harici kütüphane ile çalışır.
 */

// Base64URL Encoding / Decoding
export function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// HMAC-SHA256 Anahtar Alma
async function getHmacKey(secret) {
  const keyData = new TextEncoder().encode(secret || 'default_rescue_jwt_secret_change_me');
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Oturum Token İmzala
export async function createSessionToken(jwtSecret, maxAgeSec = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    role: 'admin',
    iat: now,
    exp: now + maxAgeSec,
  });

  const payloadB64 = base64UrlEncode(payload);
  const key = await getHmacKey(jwtSecret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payloadB64}.${sigB64}`;
}

// Oturum Token Doğrula
export async function verifySessionToken(token, jwtSecret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKey(jwtSecret);

    // Signature Decode
    let base64 = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const signatureBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signatureBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payloadB64)
    );

    if (!isValid) return false;

    const payloadJson = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);
    if (payloadJson.exp && payloadJson.exp < now) {
      return false; // Süresi dolmuş
    }

    return payloadJson;
  } catch {
    return false;
  }
}

// Cookie ayrıştırma
export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Token Çıkarma (Hem Authorization: Bearer hem de Cookie destekli)
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }
  return getCookie(request, 'rescue_session');
}

// Timing-Safe Dize Karşılaştırması (Side-channel saldırılarına karşı)
export async function timingSafeEqualStrings(a, b) {
  const encoder = new TextEncoder();
  const hashABuffer = await crypto.subtle.digest('SHA-256', encoder.encode(a || ''));
  const hashBBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(b || ''));

  const bufA = new Uint8Array(hashABuffer);
  const bufB = new Uint8Array(hashBBuffer);

  if (typeof crypto.timingSafeEqual === 'function') {
    return crypto.timingSafeEqual(bufA, bufB);
  }

  // Sabit uzunlukta (32-byte SHA-256) taşınabilir constant-time karşılaştırma
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}
