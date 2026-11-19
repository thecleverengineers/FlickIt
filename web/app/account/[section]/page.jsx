import { notFound, redirect } from 'next/navigation';
import { getCustomer, getCustomerOrders } from '../../customer-session';
import Account from '../profile';
import { privateSections, publicSections, sectionSlug } from '../sections';
import '../profile.css';

export default async function AccountSection({ params, searchParams }) {
  const { section } = await params;
  const title = [...publicSections, ...privateSections].find(label => sectionSlug(label) === section);
  if (!title) notFound();
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const customer = await getCustomer();
  if (!customer && privateSections.includes(title)) redirect(`/login${query}`);
  const orders = section === 'your-orders' ? await getCustomerOrders() : null;
  return <Account homeHref={`/${query}`} bagHref={`/bag${query}`}
    loginHref={`/login${query}`} customer={customer} orders={orders} section={section} sectionTitle={title} />;
}
