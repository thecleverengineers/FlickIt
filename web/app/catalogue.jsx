import { notFound, unstable_rethrow } from 'next/navigation';
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
  let delay = 1000;
  let failure;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        ...options, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
      if (response.ok) return await response.json();
      if (path === '/v1/products' && params?.has('location') && response.status === 400) return null;
      failure = new Error(`Catalogue API returned HTTP ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      failure = error;
    }
    const remaining = deadline - Date.now();
    if (remaining <= delay) break;
    await new Promise(resolve => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 8000);
  }
  throw failure ?? new Error('Catalogue API unavailable');
}

async function Catalogue({ searchParams, bagPage, categoriesPage, productId }) {
  const allowDemoFallback = process.env.FLICKIT_DEMO_CATALOGUE_FALLBACK === 'true';
  const timeout = allowDemoFallback ? 3500 : 65000;
  let locations = [];
  let current = '';
  const { location, category } = await searchParams;
  const customerRequest = getCustomer();
  try {
    const requestedLocation = typeof location === 'string' ? location : '';
    const params = requestedLocation ? new URLSearchParams({ location: requestedLocation }) : undefined;
    const marketplaceRequest = getApi('/v1/marketplace', timeout).catch(error => {
      console.warn('Marketplace settings unavailable:', error.message);
      return { locations: [], checkoutAvailable: false };
    });
    const productsRequest = getApi('/v1/products', timeout, params).then(result =>
      result ?? getApi('/v1/products', timeout));
    const [marketplace, { products }, customer] = await Promise.all([
      marketplaceRequest, productsRequest, customerRequest,
    ]);
    locations = marketplace.locations;
    current = locations.find(area => area.id === requestedLocation)?.id || '';
    if (productId && !products.some(product => product.id === productId)) notFound();
    return <Store customer={customer} bagPage={bagPage} categoriesPage={categoriesPage} productId={productId} initialCategory={category} key={current} products={products} locations={locations}
      locationId={current} checkoutAvailable={marketplace.checkoutAvailable} />;
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Product catalogue unavailable:', error.message);
    const customer = await customerRequest;
    if (allowDemoFallback) {
      const demoLocation = demoMarketplace.locations.find(area => area.id === location)?.id || '';
      return <Store customer={customer} bagPage={bagPage} categoriesPage={categoriesPage} productId={productId} initialCategory={category} key={demoLocation} products={getCatalogue(demoMarketplace, demoLocation)}
        locations={demoMarketplace.locations} locationId={demoLocation} checkoutAvailable={false} demoFallback />;
    }
    return <Store customer={customer} bagPage={bagPage} categoriesPage={categoriesPage} productId={productId} products={[]} locations={locations} locationId={current || (typeof location === 'string' ? location : '')} catalogueState="unavailable" />;
  }
}

export default async function CataloguePage({ searchParams, bagPage = false, categoriesPage = false, productId }) {
  const { location } = await searchParams;
  return <Suspense fallback={<Store bagPage={bagPage} categoriesPage={categoriesPage} productId={productId} products={[]} locations={[]} locationId={typeof location === 'string' ? location : ''} catalogueState="loading" />}>
    <Catalogue bagPage={bagPage} categoriesPage={categoriesPage} productId={productId} searchParams={searchParams} />
  </Suspense>;
}
