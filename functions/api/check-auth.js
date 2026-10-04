import { extractToken, verifySessionToken } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const token = extractToken(request);

  if (!token) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const session = await verifySessionToken(token, env.JWT_SECRET);
  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ authenticated: true, role: session.role }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
