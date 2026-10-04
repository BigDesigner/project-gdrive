/**
 * Cloudflare Worker API Entrypoint: gdrive-api
 * Custom Domain: gdrive-api.gnn.tr
 * Workers.dev: gdrive-api.bigdesigner.workers.dev
 */

import { onRequestPost as loginHandler } from '../functions/api/login.js';
import { onRequest as logoutHandler } from '../functions/api/logout.js';
import { onRequestGet as checkAuthHandler } from '../functions/api/check-auth.js';
import { onRequestGet as statusHandler } from '../functions/api/status.js';
import { onRequestPost as uploadHandler } from '../functions/api/upload.js';

// İzin verilen CORS kökenleri (Origins)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/gdrive\.gnn\.tr$/,
  /^https:\/\/gdrive-frontend\.pages\.dev$/,
  /^https:\/\/.*\.pages\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = new Headers();

  if (origin && isOriginAllowed(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Encryption-Password');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = getCorsHeaders(request);

    // 1. CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, ''); // Trailing slash temizle

    const context = {
      request,
      env,
      waitUntil: (p) => ctx.waitUntil(p),
      next: () => {},
    };

    let response;

    try {
      if (path === '/api/login' || path === '/login') {
        response = await loginHandler(context);
      } else if (path === '/api/logout' || path === '/logout') {
        response = await logoutHandler(context);
      } else if (path === '/api/check-auth' || path === '/check-auth') {
        response = await checkAuthHandler(context);
      } else if (path === '/api/status' || path === '/status') {
        response = await statusHandler(context);
      } else if (path === '/api/upload' || path === '/upload') {
        response = await uploadHandler(context);
      } else if (path === '' || path === '/') {
        response = new Response(
          JSON.stringify({
            status: 'operational',
            service: 'GDrive Rescue Vault Worker API',
            version: '1.0.0',
            endpoints: ['/api/login', '/api/check-auth', '/api/status', '/api/upload', '/api/logout'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ success: false, error: 'Endpoint bulunamadı' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      response = new Response(
        JSON.stringify({ success: false, error: err.message || 'Sunucu hatası' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CORS & Güvenlik Başlıklarını Yanıta Ekle
    const newHeaders = new Headers(response.headers);
    for (const [key, val] of corsHeaders.entries()) {
      newHeaders.set(key, val);
    }
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
