'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../store-header';

const preferencesKey = 'flickit.account-preferences';
const orderKey = 'flickit.last-order-summary';
const defaults = { birthday: '', appearance: 'system', showOffers: true };
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

function Detail({ title, children }) {
  return <details className="account-detail"><summary>{title}</summary>
    <div className="account-detail-body">{children}</div>
  </details>;
}

export default function Account({ homeHref, bagHref }) {
  const [preferences, setPreferences] = useState(defaults);
  const [order, setOrder] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
      setPreferences({ ...defaults, ...saved });
      setOrder(JSON.parse(sessionStorage.getItem(orderKey) || 'null'));
    } catch {}
  }, []);

  function save(field, value) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    try {
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      setNotice('Preference saved on this device.');
    } catch {
      setNotice('Your browser couldn’t save this preference.');
    }
  }

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: 'Flickit', url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Storefront link copied.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') setNotice(`Share this link: ${url}`);
    }
  }

  return <div className={`store account-page theme-${preferences.appearance}`}>
    <main>
      <a className="account-back" href={homeHref}>← Back to shopping</a>
      <section className="account-hero">
        <span className="account-avatar"><Icon name="user" /></span>
        <h1>Your account</h1>
        <p>Shopping as a guest</p>
      </section>
      <section className="account-group">
        <Detail title={preferences.birthday ? 'Edit your birthday' : 'Add your birthday'}>
          <label>Birthday <input type="date" value={preferences.birthday}
            onChange={event => save('birthday', event.target.value)} /></label>
        </Detail>
        <Detail title="Your orders">
          {order ? <p>Last order <strong>{order.reference}</strong> · {money.format(order.totalPaise / 100)}</p>
            : <p>No confirmed orders in this browser session.</p>}
        </Detail>
        <Detail title="Need help?"><p>Review your delivery area and items in <a href={bagHref}>your bag</a>.</p></Detail>
        <Detail title="Appearance">
          <label>Account theme <select value={preferences.appearance}
            onChange={event => save('appearance', event.target.value)}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select></label>
        </Detail>
        <Detail title="Content preferences">
          <label><input type="checkbox" checked={preferences.showOffers}
            onChange={event => save('showOffers', event.target.checked)} /> Show the promotional banner on Home</label>
        </Detail>
      </section>
      <section className="account-group"><h2>Your information</h2>
        <a className="account-row" href={`${homeHref}#location`}>Delivery area <span aria-hidden="true">›</span></a>
        <Detail title="Address book"><p>Saved addresses will be available with customer accounts.</p></Detail>
        <Detail title="Your wishlist"><p>Wishlist syncing is unavailable during the preview.</p></Detail>
        <Detail title="Bookmarked recipes"><p>Recipe bookmarks are unavailable during the preview.</p></Detail>
        <Detail title="GST details"><p>GST billing details are unavailable during the preview.</p></Detail>
        <Detail title="E-gift cards"><p>Gift card purchases are not open yet.</p></Detail>
        <Detail title="Your prescriptions"><p>Prescription uploads are unavailable.</p></Detail>
      </section>
      <section className="account-group"><h2>Payments and rewards</h2>
        <Detail title="Payment settings"><p>Payment options are shown at checkout when ordering is available.</p></Detail>
        <Detail title="Flickit Money"><p>The Flickit wallet is unavailable during the preview.</p></Detail>
        <Detail title="Claim gift card"><p>Gift card redemption is unavailable during the preview.</p></Detail>
        <Detail title="Collected rewards"><p>Flickit has no active rewards programme.</p></Detail>
      </section>
      <section className="account-group"><h2>Community</h2>
        <Detail title="Community impact"><p>Flickit has no active community programmes listed.</p></Detail>
        <Detail title="Donation receipts"><p>Flickit does not accept donations during the preview.</p></Detail>
      </section>
      <section className="account-group"><h2>About Flickit</h2>
        <button className="account-row" type="button" onClick={share}>Share Flickit <span aria-hidden="true">›</span></button>
        <Detail title="About us"><p>Flickit is a grocery marketplace for browsing local delivery options.</p></Detail>
        <Detail title="Sell on Flickit"><p>Public seller applications are closed during the preview.</p></Detail>
        <Detail title="Account privacy"><p>Birthday and display preferences stay in this browser. Recent order summaries are kept for the browser session.</p>
          <button type="button" onClick={() => {
            try {
              localStorage.removeItem(preferencesKey);
              sessionStorage.removeItem(orderKey);
              sessionStorage.removeItem("flickit.last-order-items");
              setPreferences(defaults);
              setOrder(null);
              setNotice('Account preferences and the recent order summary were cleared.');
            } catch { setNotice('Your browser couldn’t clear this information.'); }
          }}>Clear account data on this device</button>
        </Detail>
        <Detail title="Notification preferences"><p>Flickit does not send account notifications during the preview.</p></Detail>
        <Detail title="Beta programme"><p>Public beta enrolment is unavailable.</p></Detail>
      </section>
      {notice && <p className="account-notice" role="status">{notice}</p>}
    </main>
    <nav className="bottom-appbar" aria-label="Shopping shortcuts">
      <a href={homeHref}><span className="appbar-icon"><Icon name="home" /></span><span>Home</span></a>
      <a href={bagHref}><span className="appbar-icon"><Icon name="bag" /></span><span>Bag</span></a>
      <a href={`${homeHref}#browse`}><span className="appbar-icon"><Icon name="browse" /></span><span>Categories</span></a>
      <a href="#top" aria-current="page"><span className="appbar-icon"><Icon name="user" /></span><span>Account</span></a>
    </nav>
  </div>;
}
