export async function onRequest(context) {
  const cookieHeader = 'rescue_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
  return new Response(
    JSON.stringify({ success: true, message: 'Oturum kapatıldı.' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    }
  );
}
