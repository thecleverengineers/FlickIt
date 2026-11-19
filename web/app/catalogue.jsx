import { Suspense } from 'react';
import { demoMarketplace, getCatalogue } from '../../api/marketplace';
import Store from './store';
import { getCustomer } from './customer-session';

async function getApi(path, timeout, params) {
  const url = new URL(path, process.env.API_ORIGIN || 'http://localhost:4000');
  if (params) url.search = params.toString();
  const options = path === '/v1/products'
    ? { next: { revalidate: 60 } }
    : { cache: 'no-store' };
  const deadline = Date.now() + timeout;
  for (const attemptTimeout of [Math.min(8000, timeout), timeout]) {
    try {
      const response = await fetch(url, {
        ...options, signal: AbortSignal.timeout(Math.max(1, Math.min(attemptTimeout, deadline - Date.now()))),
      });
      if (response.ok) return await response.json();
      if (response.status < 500 || Date.now() >= deadline) {
        throw new Error(`Catalogue API returned HTTP ${response.status}`);
      }
    } catch (error) {
      if (attemptTimeout === timeout || Date.now() >= deadline) throw error;
    }
  }
  throw new Error('Catalogue API unavailable');
}

async function Catalogue({ searchParams, bagPage }) {
  const allowDemoFallback = process.env.FLICKIT_DEMO_CATALOGUE_FALLBACK === 'true';
  const timeout = allowDemoFallback ? 3500 : 55000;
  let locations = [];
  let current = '';
  const { location } = await searchParams;
  const customer = await getCustomer();
  try {
    const marketplaceRequest = getApi('/v1/marketplace', Math.min(timeout, 8000)).catch(error => {
      console.warn('Marketplace settings unavailable:', error.message);
      return { locations: [], checkoutAvailable: false };
    });
    let products;
    let marketplace;
    if (typeof location === 'string' && location) {
      marketplace = await marketplaceRequest;
      locations = marketplace.locations;
      current = locations.find(area => area.id === location)?.id || '';
      const params = new URLSearchParams(current ? { location: current } : {});
      ({ products } = await getApi('/v1/products', timeout, params));
    } else {
      [marketplace, { products }] = await Promise.all([
        marketplaceRequest, getApi('/v1/products', timeout),
      ]);
      locations = marketplace.locations;
    }
    return <Store customer={customer} bagPage={bagPage} key={current} products={products} locations={locations}
      locationId={current} checkoutAvailable={marketplace.checkoutAvailable} />;
  } catch (error) {
    console.warn('Product catalogue unavailable:', error.message);
    if (allowDemoFallback) {
      const demoLocation = demoMarketplace.locations.find(area => area.id === location)?.id || '';
      return <Store customer={customer} bagPage={bagPage} key={demoLocation} products={getCatalogue(demoMarketplace, demoLocation)}
        locations={demoMarketplace.locations} locationId={demoLocation} checkoutAvailable={false} demoFallback />;
    }
    return <Store customer={customer} bagPage={bagPage} products={[]} locations={locations} locationId={current || (typeof location === 'string' ? location : '')} catalogueState="unavailable" />;
  }
}

export default async function CataloguePage({ searchParams, bagPage = false }) {
  const { location } = await searchParams;
  return <Suspense fallback={<Store bagPage={bagPage} products={[]} locations={[]} locationId={typeof location === 'string' ? location : ''} catalogueState="loading" />}>
    <Catalogue bagPage={bagPage} searchParams={searchParams} />
  </Suspense>;
}
