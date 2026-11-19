const noStore = { 'Cache-Control': 'no-store' };

export async function forwardAdmin(request, resource, body) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return Response.json({ error: 'Admin token required' }, { status: 401, headers: noStore });
  }
  try {
    const target = new URL(`/v1/admin/${resource}`, process.env.API_ORIGIN || 'http://localhost:4000');
    const upstream = await fetch(target, {
      method: request.method,
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body,
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
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
