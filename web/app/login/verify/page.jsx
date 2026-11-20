import { redirect } from 'next/navigation';
import { getCustomer } from '../../customer-session';
import Login from '../otp-form';
import '../../account/profile.css';

export const metadata = { title: 'OTP verification | Flickit' };

export default async function VerifyPage({ searchParams }) {
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const accountHref = `/account${query}`;
  if (await getCustomer()) redirect(accountHref);
  return <div className="store account-page login-page">
    <main>
      <header className="otp-heading"><a href={`/login${query}`} aria-label="Back to sign in">←</a><h1>OTP verification</h1></header>
      <section className="login-content"><Login accountHref={accountHref} verification /></section>
    </main>
  </div>;
}
