'use client';

import { useEffect, useRef, useState } from 'react';
import OrderSummary from './order-summary';
import { sectionSlug } from './sections';
import { Icon } from '../store-header';

const preferencesKey = 'flickit.account-preferences';
const defaults = { birthday: '', appearance: 'system', showOffers: true };
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function Account({ homeHref, bagHref, loginHref, customer = null, orders = null, orderCatalogue = {}, section, sectionTitle, orderDetails, ordersHref }) {
  const query = homeHref.slice(1);
  const accountHref = `/account${query}`;
  const detailHref = title => `/account/${sectionSlug(title)}${query}`;
  const detail = (title, children, label = title) => {
    if (section) return sectionSlug(title) === section
      ? <div className={section === "your-orders" ? "account-detail-body order-history-body" : "account-detail-body"}>{children}</div>
      : null;
    return <a className="account-row" href={detailHref(title)}>{label}<span aria-hidden="true">›</span></a>;
  };
  const birthdayKey = customer ? `flickit.birthday.${customer.id}` : null;
  const [preferences, setPreferences] = useState(defaults);
  const [notice, setNotice] = useState('');
  const logoutDialog = useRef(null);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const addressKey = customer ? `flickit.addresses.${customer.id}` : null;
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (!addressKey || section !== 'address-book') return;
    try {
      const saved = JSON.parse(localStorage.getItem(addressKey) || '[]');
      if (Array.isArray(saved)) setAddresses(saved.filter(address => typeof address === 'string'));
    } catch {}
  }, [addressKey, section]);

  function saveAddresses(next) {
    try {
      localStorage.setItem(addressKey, JSON.stringify(next));
      setAddresses(next);
      return true;
    } catch {
      setNotice('Your browser couldn’t save your addresses.');
      return false;
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferencesKey) || '{}');
      setPreferences({ ...defaults, appearance: saved?.appearance || defaults.appearance,
        showOffers: saved?.showOffers !== false, birthday: birthdayKey ? localStorage.getItem(birthdayKey) || "" : "" });
    } catch {}
  }, [birthdayKey]);

  function save(field, value) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    try {
      if (field === 'birthday' && birthdayKey) localStorage.setItem(birthdayKey, value);
      localStorage.setItem(preferencesKey, JSON.stringify({ appearance: next.appearance, showOffers: next.showOffers }));
      setNotice('Preference saved on this device.');
    } catch {
      setNotice('Your browser couldn’t save this preference.');
    }
  }

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error();
      window.location.assign(accountHref);
    } catch {
      setLogoutError('Could not sign out. Try again.');
      setSigningOut(false);
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

  return <div className={`store account-page ${section ? "account-subpage" : ""} ${section === "your-orders" ? "orders-page" : ""} theme-${preferences.appearance}`}>
    <main>
      <a className="account-back" href={orderDetails ? ordersHref : section ? accountHref : homeHref}>{orderDetails ? "← Back to orders" : section === "your-orders" ? "← Back" : section ? "← Back to account" : "← Back to shopping"}</a>
      {section ? <h1 className="account-section-title">{sectionTitle}</h1> : <section className="account-hero">
        <span className="account-avatar"><Icon name={customer ? "profile" : "user"} /></span>
        <h1>Your account</h1>
        <p>{customer ? `+91 ${customer.mobile}` : "Log in to view your complete profile"}</p>
      </section>}
      {customer ? <>
      <section className="account-group">
        {detail('Birthday', <>
          <label>Birthday <input type="date" value={preferences.birthday}
            onChange={event => save('birthday', event.target.value)} /></label>
        </>, preferences.birthday ? 'Edit your birthday' : 'Add your birthday')}
        {detail('Your orders', <>
          {orders === null ? <p>Order history is temporarily unavailable.</p> :
            orders.length && orderDetails ? <OrderSummary order={orders[0]} catalogue={orderCatalogue} bagHref={bagHref} /> :
            orders.length ? <ul className="order-history">{orders.map(({ receipt, createdAt }) => <li className="order-card" key={receipt.reference}>
              {!orderDetails && <a className="order-card-link"
                href={`/account/your-orders/${encodeURIComponent(receipt.reference)}${query}`}
                aria-label={`View details for order #${receipt.reference.slice(0, 8).toUpperCase()}`} />}
              <header>
                <div><h2>Order #{receipt.reference.slice(0, 8).toUpperCase()}</h2>
                  {createdAt && <time dateTime={createdAt}>{new Intl.DateTimeFormat('en-IN', {
                    dateStyle: 'medium', timeZone: 'Asia/Kolkata',
                  }).format(new Date(createdAt))}</time>}
                </div>
                <div className="order-header-meta">
                  <span className="order-status">{receipt.status.replaceAll('_', ' ')}</span>
                  <strong aria-label={`Order total ${money.format(receipt.totalPaise / 100)}`}>{money.format(receipt.totalPaise / 100)}</strong>
                </div>
              </header>
              {!orderDetails && <ul className="order-photo-strip" tabIndex={0} aria-label="Ordered products">
                {(receipt.items ?? []).map(item => <li key={item.id} className="order-photo" title={item.name}>
                  {orderCatalogue[item.id]?.imageUrl ? <img src={orderCatalogue[item.id]?.imageUrl} alt={item.name} width="60" height="60" loading="lazy" />
                    : <span role="img" aria-label={item.name}><Icon name="bag" /></span>}
                </li>)}
              </ul>}
              <p className="order-card-action" aria-hidden="true">View order details →</p>
            </li>)}</ul> : <p>No confirmed orders on your account yet.</p>}
        </>)}
        {detail('Need help?', <><p>Review your delivery area and items in <a href={bagHref}>your bag</a>.</p></>)}
        {detail('Appearance', <>
          <label>Account theme <select value={preferences.appearance}
            onChange={event => save('appearance', event.target.value)}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select></label>
        </>)}
        {detail('Content preferences', <>
          <label><input type="checkbox" checked={preferences.showOffers}
            onChange={event => save('showOffers', event.target.checked)} /> Show the promotional banner on Home</label>
        </>)}
      </section>
      <section className="account-group"><h2>Your information</h2>
        {detail('Delivery area', <a href={`${homeHref}#location`}>Choose a delivery area</a>)}
        {detail('Address book', <><p>Save delivery addresses on this device.</p>
          {addresses.length > 0 && <ul>{addresses.map(address => <li key={address}>
            <p>{address}</p>
            <button type="button" onClick={() => navigator.clipboard.writeText(address)
              .then(() => setNotice('Address copied.')).catch(() => setNotice('Could not copy the address.'))}>Copy</button>
            <button type="button" onClick={() => saveAddresses(addresses.filter(value => value !== address))}>Remove</button>
          </li>)}</ul>}
          <form onSubmit={event => {
            event.preventDefault();
            const form = event.currentTarget;
            const address = new FormData(form).get('address').trim();
            if (address.length >= 10 && !addresses.includes(address) && saveAddresses([...addresses, address])) form.reset();
          }}>
            <label>Delivery address <input name="address" autoComplete="street-address" minLength={10} maxLength={400} required /></label>
            <button>Save address</button>
          </form></>)}
        {detail('Your wishlist', <><p>Wishlist syncing is unavailable during the preview.</p></>)}
        {detail('Bookmarked recipes', <><p>Recipe bookmarks are unavailable during the preview.</p></>)}
        {detail('GST details', <><p>GST billing details are unavailable during the preview.</p></>)}
        {detail('E-gift cards', <><p>Gift card purchases are not open yet.</p></>)}
        {detail('Your prescriptions', <><p>Prescription uploads are unavailable.</p></>)}
      </section>
      <section className="account-group"><h2>Payments and rewards</h2>
        {detail('Payment settings', <><p>Cash on delivery is available in supported delivery areas.</p><a href={bagHref}>Review payment at checkout</a></>)}
        {detail('Flickit Money', <><p>The Flickit wallet is unavailable during the preview.</p></>)}
        {detail('Claim gift card', <><p>Gift card redemption is unavailable during the preview.</p></>)}
        {detail('Collected rewards', <><p>Flickit has no active rewards programme.</p></>)}
      </section>
      <section className="account-group"><h2>Community</h2>
        {detail('Community impact', <><p>Flickit has no active community programmes listed.</p></>)}
        {detail('Donation receipts', <><p>Flickit does not accept donations during the preview.</p></>)}
      </section>
      <section className="account-group"><h2>About Flickit</h2>
        {detail('Share Flickit', <button type="button" onClick={share}>Share storefront link</button>)}
        {detail('About us', <><p>Flickit is a grocery marketplace for browsing local delivery options.</p></>)}
        {detail('Sell on Flickit', <><p>Public seller applications are closed during the preview.</p></>)}
        {detail('Account privacy', <><p>Birthday and display preferences stay in this browser. Orders placed while signed in are stored in your Flickit account.</p>
          <button type="button" onClick={() => {
            try {
              localStorage.removeItem(preferencesKey);
              if (birthdayKey) localStorage.removeItem(birthdayKey);
              if (addressKey) localStorage.removeItem(addressKey);
              sessionStorage.removeItem("flickit.last-order-items");
              setPreferences(defaults);
              setNotice('Local account preferences and reorder items were cleared.');
            } catch { setNotice('Your browser couldn’t clear this information.'); }
          }}>Clear account data on this device</button>
        </>)}
        {detail('Notification preferences', <><p>Flickit does not send account notifications during the preview.</p></>)}
        {detail('Beta programme', <><p>Public beta enrolment is unavailable.</p></>)}
      </section>
      {!section && <section className="account-group">
        <button type="button" className="account-row" aria-haspopup="dialog" onClick={() => {
          setLogoutError('');
          logoutDialog.current.showModal();
        }}>Log out <span aria-hidden="true">›</span></button>
        <dialog ref={logoutDialog} className="logout-dialog" aria-labelledby="logout-title"
          onCancel={event => { if (signingOut) event.preventDefault(); }}>
          <h2 id="logout-title">Log out?</h2>
          {logoutError && <p role="alert">{logoutError}</p>}
          <div className="logout-actions">
            <button type="button" autoFocus disabled={signingOut} onClick={() => logoutDialog.current.close()}>Cancel</button>
            <button type="button" disabled={signingOut} onClick={logout}>{signingOut ? 'Logging out…' : 'Log out'}</button>
          </div>
        </dialog>
      </section>}
      </> : <>
        {!section && <a href={loginHref} className="account-continue">Continue</a>}
        <div className="account-shortcuts">
          <a href={loginHref}><Icon name="bag" />Your orders</a>
          <a href={loginHref}><Icon name="profile" />Flickit Money</a>
          <a href={detailHref("Need help?")}><Icon name="user" />Need help?</a>
        </div>
        <section className="account-group">
          {detail('Appearance', <>
            <label>Account theme <select value={preferences.appearance}
              onChange={event => save('appearance', event.target.value)}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select></label>
          </>)}
        </section>
        <section className="account-group"><h2>Your information</h2>
          <a className="account-row" href={loginHref}>Address book <span aria-hidden="true">›</span></a>
        </section>
        <section className="account-group" id="account-help"><h2>Other information</h2>
          {detail('Need help?', <><p>For shopping and delivery options, visit <a href={bagHref}>your bag</a>.</p></>)}
          {detail('Share Flickit', <button type="button" onClick={share}>Share storefront link</button>)}
          {detail('About us', <><p>Flickit is a grocery marketplace for browsing local delivery options.</p></>)}
          {detail('Sell on Flickit', <><p>Public seller applications are closed during the preview.</p></>)}
          {detail('Beta programme', <><p>Public beta enrolment is unavailable.</p></>)}
        </section>
      </>}
      {notice && <p className="account-notice" role="status">{notice}</p>}
    </main>
    <nav className="bottom-appbar" aria-label="Shopping shortcuts">
      <a href={homeHref}><span className="appbar-icon"><Icon name="home" /></span><span>Home</span></a>
      <a href={bagHref}><span className="appbar-icon"><Icon name="bag" /></span><span>Bag</span></a>
      <a href={`/categories${query}`}><span className="appbar-icon"><Icon name="browse" /></span><span>Categories</span></a>
      <a href={accountHref} aria-current="page"><span className="appbar-icon"><Icon name="user" /></span><span>Account</span></a>
    </nav>
  </div>;
}
