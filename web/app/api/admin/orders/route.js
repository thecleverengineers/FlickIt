import { forwardAdmin } from '../forward';

export function GET(request) {
  return forwardAdmin(request, 'orders');
}

export function PATCH(request) {
  if (!request.body) return Response.json({ error: 'Order update required' }, { status: 400 });
  return forwardAdmin(request, 'orders', request.body);
}
