import { getCustomer, getCustomerOrders } from '../customer-session';
import Account from './profile';
import './profile.css';

export const metadata = { title: 'Your account | Flickit' };

export default async function AccountPage({ searchParams }) {
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const customer = await getCustomer();
  const orders = customer ? await getCustomerOrders() : null;
  return <Account homeHref={`/${query}`} bagHref={`/bag${query}`}
    loginHref={`/login${query}`} customer={customer} orders={orders} />;
}
