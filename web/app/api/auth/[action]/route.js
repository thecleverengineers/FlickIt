import { NextResponse } from 'next/server';
import { customerApi, sessionCookie } from '../../../customer-session';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(request, { params }) {
  const { action } = await params;
  if (!['request', 'verify', 'logout'].includes(action)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: noStore });
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 403, headers: noStore });
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = request.cookies.get(sessionCookie)?.value;
    if (action === 'logout' && token) headers.Authorization = `Bearer ${token}`;
    const upstream = await customerApi(action, {
      method: 'POST', headers, body: request.body, duplex: 'half',
    });
    const result = await upstream.json();
    if (action === 'logout' && (upstream.ok || upstream.status === 401)) {
      const response = NextResponse.json({ signedOut: true }, { headers: noStore });
      response.cookies.delete(sessionCookie);
      return response;
    }
    if (action === 'verify' && upstream.ok) {
      const response = NextResponse.json({ signedIn: true }, { headers: noStore });
      response.cookies.set(sessionCookie, result.sessionToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', path: '/', maxAge: result.expiresIn,
      });
      return response;
    }
    return NextResponse.json(result, { status: upstream.status, headers: noStore });
  } catch {
    return NextResponse.json({ error: 'Mobile sign-in is temporarily unavailable.' },
      { status: 503, headers: noStore });
  }
}
