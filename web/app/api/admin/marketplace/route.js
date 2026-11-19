const noStore = { 'Cache-Control': 'no-store' };

async function forward(request, body) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return Response.json({ error: 'Admin token required' }, { status: 401, headers: noStore });
  }
  try {
    const target = new URL('/v1/admin/marketplace', process.env.API_ORIGIN || 'http://localhost:4000');
    const upstream = await fetch(target, {
      method: request.method,
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...noStore, 'Content-Type': 'application/json' },
    });
  } catch {
    return Response.json({ error: 'Could not reach the marketplace API' }, { status: 503, headers: noStore });
  }
}

export function GET(request) {
  return forward(request);
}

export async function PUT(request) {
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Configuration body required" }, { status: 400, headers: noStore });
  const chunks = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      return Response.json({ error: 'Configuration exceeds 1 MiB' }, { status: 413, headers: noStore });
    }
    chunks.push(value);
  }
  return forward(request, Buffer.concat(chunks));
}
