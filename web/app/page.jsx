import { Suspense } from 'react';
import Store from './store';

export const dynamic = 'force-dynamic';

async function getApi(path, signal, params) {
  const url = new URL(path, process.env.API_ORIGIN || 'http://localhost:4000');
  if (params) url.search = params.toString();
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Catalogue API returned HTTP ${response.status}`);
  return response.json();
}

async function Catalogue({ searchParams }) {
  const signal = AbortSignal.timeout(45000);
  let locations = [];
  let current = '';
  try {
    const { location } = await searchParams;
    const marketplaceRequest = getApi('/v1/marketplace', signal);
    let products;
    let marketplace;
    if (typeof location === 'string' && location) {
      marketplace = await marketplaceRequest;
      locations = marketplace.locations;
      current = locations.find(area => area.id === location)?.id || '';
      const params = new URLSearchParams(current ? { location: current } : {});
      ({ products } = await getApi('/v1/products', signal, params));
    } else {
      [marketplace, { products }] = await Promise.all([
        marketplaceRequest, getApi('/v1/products', signal),
      ]);
      locations = marketplace.locations;
    }
    return <Store key={current} products={products} locations={locations}
      locationId={current} checkoutAvailable={marketplace.checkoutAvailable} />;
  } catch {
    return <Store products={[]} locations={locations} locationId={current} catalogueState="unavailable" />;
  }
}

export default function Page({ searchParams }) {
  return <Suspense fallback={<Store products={[]} locations={[]} catalogueState="loading" />}>
    <Catalogue searchParams={searchParams} />
  </Suspense>;
}
