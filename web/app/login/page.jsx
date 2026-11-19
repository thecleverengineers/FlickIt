import { redirect } from 'next/navigation';
import { getCustomer } from '../customer-session';
import Login from './otp-form';
import '../account/profile.css';

export const metadata = { title: 'Sign in | Flickit' };

export default async function LoginPage({ searchParams }) {
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const accountHref = `/account${query}`;
  if (await getCustomer()) redirect(accountHref);
  return <div className="store account-page">
    <main>
      <a className="account-back" href={accountHref}>← Back to account</a>
      <section className="account-hero">
        <img src="/flickit-logo.png" width="150" alt="Flickit" />
        <h1>Sign in</h1>
        <p>Use your mobile number to get a one-time code.</p>
      </section>
      <Login accountHref={accountHref} />
    </main>
  </div>;
}
