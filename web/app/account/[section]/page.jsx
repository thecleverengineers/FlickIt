import { notFound, redirect } from 'next/navigation';
import { getCustomer, getCustomerOrders } from '../../customer-session';
import Account from '../profile';
import { privateSections, publicSections, sectionSlug } from '../sections';
import '../profile.css';

async function getOrderPhotos() {
  try {
    const response = await fetch(new URL('/v1/products', process.env.API_ORIGIN || 'http://localhost:4000'), {
      next: { revalidate: 300 }, signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const { products } = await response.json();
      return Object.fromEntries(products.filter(({ imageUrl }) => imageUrl).map(({ id, imageUrl }) => [id, imageUrl]));
    }
  } catch {}
  return {};
}

export default async function AccountSection({ params, searchParams }) {
  const { section } = await params;
  const title = [...publicSections, ...privateSections].find(label => sectionSlug(label) === section);
  if (!title) notFound();
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const customer = await getCustomer();
  if (!customer && privateSections.includes(title)) redirect(`/login${query}`);
  const [orders, orderPhotos] = section === 'your-orders'
    ? await Promise.all([getCustomerOrders(), getOrderPhotos()])
    : [null, {}];
  return <Account homeHref={`/${query}`} bagHref={`/bag${query}`}
    loginHref={`/login${query}`} customer={customer} orders={orders} orderPhotos={orderPhotos} section={section} sectionTitle={title} />;
}
