import { getCustomer } from '../customer-session';
import Account from './profile';
import './profile.css';

export const metadata = { title: 'Your account | Flickit' };

export default async function AccountPage({ searchParams }) {
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  return <Account homeHref={`/${query}`} bagHref={`/bag${query}`}
    loginHref={`/login${query}`} customer={await getCustomer()} />;
}
