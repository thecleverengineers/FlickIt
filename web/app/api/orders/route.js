import { sessionCookie } from '../../customer-session';

export async function POST(request) {
  const token = request.cookies.get(sessionCookie)?.value;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const upstream = await fetch(new URL('/v1/orders', process.env.API_ORIGIN || 'http://localhost:4000'), {
      method: 'POST',
      headers,
      body: request.body,
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(12000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Checkout could not be confirmed. Retry without changing your order.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
