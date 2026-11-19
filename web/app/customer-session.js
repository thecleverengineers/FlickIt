import 'server-only';
import { cookies } from 'next/headers';

export const sessionCookie = 'flickit_customer';

export function customerApi(action, options = {}) {
  return fetch(new URL(`/v1/auth/${action}`, process.env.API_ORIGIN || 'http://localhost:4000'), {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), ...options,
  });
}

export async function getCustomer() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  try {
    const response = await customerApi('session', { headers: { Authorization: `Bearer ${token}` } });
    return response.ok ? (await response.json()).customer : null;
  } catch {
    return null;
  }
}
