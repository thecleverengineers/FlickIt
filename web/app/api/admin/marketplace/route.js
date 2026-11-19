import { forwardAdmin } from '../forward';

const noStore = { 'Cache-Control': 'no-store' };

export function GET(request) {
  return forwardAdmin(request, 'marketplace');
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
  return forwardAdmin(request, 'marketplace', Buffer.concat(chunks));
}
