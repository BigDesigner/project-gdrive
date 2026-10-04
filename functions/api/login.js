import { createSessionToken, timingSafeEqualStrings } from './_auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const expectedPassword = env.ADMIN_PASSWORD;
    if (!expectedPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Sistem hatası: ADMIN_PASSWORD çevre değişkeni tanımlanmamış.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Parola girilmedi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Timing-safe doğrulama
    const isValid = await timingSafeEqualStrings(password, expectedPassword);

    if (!isValid) {
      // Brute-force önleme için hafif yapay gecikme
      await new Promise((resolve) => setTimeout(resolve, 600));
      return new Response(
        JSON.stringify({ success: false, error: 'Hatalı parola! Erişim reddedildi.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Başarılı giriş: 24 saatlik güvenli token üret
    const token = await createSessionToken(env.JWT_SECRET);
    const cookieHeader = `rescue_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=86400`;

    return new Response(
      JSON.stringify({ success: true, token, message: 'Giriş başarılı.' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
