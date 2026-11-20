import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCustomer } from '../customer-session';
import CategoryIcon from '../category-icon';
import Login from './otp-form';
import '../account/profile.css';

export const metadata = { title: 'Sign in | Flickit' };

const tileCategories = [
  'Produce', 'Personal Care', 'Rice & Grains', 'Tea & Coffee',
  'Cooking Essentials', 'Dairy & Bread', 'Instant Foods', 'Drinks & Juices',
  'Biscuits & Bakery', 'Chips & Snacks', 'Personal Care', 'Cooking Essentials',
];

function Mosaic({ products = [] }) {
  const tiles = tileCategories.map((category, index) => {
    const matches = products.filter(product => product.category === category && product.imageUrl);
    const previousTiles = tileCategories.slice(0, index).filter(name => name === category).length;
    return { category, imageUrl: matches[previousTiles]?.imageUrl };
  });

  return <div className="login-mosaic" aria-hidden="true">
    {[0, 4, 8].map(start => <div className="login-mosaic-row" key={start}>
      {tiles.slice(start, start + 4).map(({ category, imageUrl }, index) => <div className="login-tile" key={index}>
        <CategoryIcon name={category} />
        {imageUrl && <img src={imageUrl} alt="" decoding="async" referrerPolicy="no-referrer" />}
      </div>)}
    </div>)}
  </div>;
}

async function CatalogueMosaic() {
  let products = [];
  try {
    const url = new URL('/v1/products', process.env.API_ORIGIN || 'http://localhost:4000');
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.products)) products = data.products;
    }
  } catch {}
  return <Mosaic products={products} />;
}

export default async function LoginPage({ searchParams }) {
  const { location } = await searchParams;
  const query = typeof location === 'string' && location ? `?${new URLSearchParams({ location })}` : '';
  const accountHref = `/account${query}`;
  if (await getCustomer()) redirect(accountHref);
  return <div className="store account-page login-page">
    <main>
      <div className="login-visual">
        <Suspense fallback={<Mosaic />}><CatalogueMosaic /></Suspense>
        <a className="login-back" href={accountHref} aria-label="Back to account">←</a>
      </div>
      <section className="login-content">
        <img className="login-logo" src="/flickit-logo.png" width="140" alt="Flickit" />
        <h1>Log in or sign up</h1>
        <p>We’ll send a one-time code to your mobile number.</p>
        <Login accountHref={accountHref} />
      </section>
    </main>
  </div>;
}
