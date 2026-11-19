import { Suspense } from 'react';
import Store from './store';

async function getApi(path, signal, params) {
  const url = new URL(path, process.env.API_ORIGIN || 'http://localhost:4000');
  if (params) url.search = params.toString();
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Catalogue API returned HTTP ${response.status}`);
  return response.json();
}

async function Catalogue({ searchParams, bagPage }) {
  const signal = AbortSignal.timeout(45000);
  let locations = [];
  let current = '';
  const { location } = await searchParams;
  try {
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
    return <Store bagPage={bagPage} key={current} products={products} locations={locations}
      locationId={current} checkoutAvailable={marketplace.checkoutAvailable} />;
  } catch {
    return <Store bagPage={bagPage} products={[]} locations={locations} locationId={current || (typeof location === 'string' ? location : '')} catalogueState="unavailable" />;
  }
}

export default async function CataloguePage({ searchParams, bagPage = false }) {
  const { location } = await searchParams;
  return <Suspense fallback={<Store bagPage={bagPage} products={[]} locations={[]} locationId={typeof location === 'string' ? location : ''} catalogueState="loading" />}>
    <Catalogue bagPage={bagPage} searchParams={searchParams} />
  </Suspense>;
}
