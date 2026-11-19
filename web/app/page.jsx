import Store from './store';

export const dynamic = 'force-dynamic';

async function getApi(path, params) {
  const url = new URL(path, process.env.API_ORIGIN || 'http://localhost:4000');
  if (params) url.search = params.toString();
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Marketplace unavailable');
  return response.json();
}

export default async function Page({ searchParams }) {
  try {
    const [{ location }, marketplace] = await Promise.all([
      searchParams, getApi('/v1/marketplace'),
    ]);
    const current = marketplace.locations.find(area => area.id === location)?.id || '';
    const params = new URLSearchParams();
    if (current) params.set('location', current);
    const { products } = await getApi('/v1/products', params);
    return <Store key={current} products={products} locations={marketplace.locations}
      locationId={current} checkoutAvailable={marketplace.checkoutAvailable} />;
  } catch {
    return <main><h1>Flickit</h1><p>We couldn’t load the catalogue.</p><a href="/">Try again</a></main>;
  }
}
