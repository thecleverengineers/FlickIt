'use client';

import { useEffect, useState } from 'react';
import Checkout from './checkout';
import StoreHeader, { Icon } from './store-header';
import CatalogueStatus from './catalogue-status';
import VoiceSearch from './voice-search';

const currency = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });
const icons = { Produce: '🥬', Dairy: '🥛', Pantry: '🌾' };
const productIcons = { banana: '🍌', tomato: '🍅', milk: '🥛', curd: '🥣', rice: '🍚', dal: '🫘' };
const lastOrderKey = 'flickit.last-order-items';
const bagKey = 'flickit.shopping-bag';
const price = paise => currency.format(paise / 100);

export default function Store({ products, locations, locationId, checkoutAvailable, catalogueState, bagPage, demoFallback, customer }) {
  const [shortcut, setShortcut] = useState('home');
  useEffect(() => {
    function readShortcut() {
      const hash = window.location.hash.slice(1);
      setShortcut(hash === 'browse' ? 'browse' : 'home');
    }
    readShortcut();
    window.addEventListener('hashchange', readShortcut);
    return () => window.removeEventListener('hashchange', readShortcut);
  }, []);

  const locationQuery = locationId ? `?${new URLSearchParams({ location: locationId })}` : '';
  const homeHref = `/${locationQuery}`;
  const accountHref = `/account${locationQuery}`;
  const bagHref = `/bag${locationQuery}`;

  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [brand, setBrand] = useState('');
  const [delivery, setDelivery] = useState('');
  const [bag, setBag] = useState({});
  const [showOffers, setShowOffers] = useState(true);
  const [lastOrder, setLastOrder] = useState([]);
  const [shoppingNotice, setShoppingNotice] = useState('');
  const [bagLoaded, setBagLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(bagKey) || '{}');
      setBag(Object.fromEntries(Object.entries(saved ?? {}).filter(([, quantity]) =>
        Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99)));
    } catch {
      setBag({});
    }
    try {
      const items = JSON.parse(sessionStorage.getItem(lastOrderKey) || '[]');
      if (Array.isArray(items)) setLastOrder(items.filter(item =>
        typeof item?.id === 'string' && Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 && item.quantity <= 99));
    } catch {}
    try { setShowOffers(JSON.parse(localStorage.getItem('flickit.account-preferences') || '{}').showOffers !== false); } catch {}
    setBagLoaded(true);
  }, []);
  useEffect(() => {
    if (!bagLoaded) return;
    try { sessionStorage.setItem(bagKey, JSON.stringify(bag)); } catch {}
  }, [bag, bagLoaded]);
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const area = locations.find(item => item.id === locationId);
  const instantTimes = products.map(product => product.instantMinutes).filter(Number.isFinite);
  const minimum = instantTimes.length ? Math.min(...instantTimes) : null;
  const maximum = instantTimes.length ? Math.max(...instantTimes) : null;
  const instantEstimate = minimum === null ? '' : minimum === maximum ? `${minimum} min` : `${minimum}–${maximum} min`;
  const brands = [...new Set(products.map(product => product.brand).filter(Boolean))];
  const visible = products.filter(product =>
    (category === 'All' || product.category === category) &&
    (!brand || product.brand === brand) &&
    (!delivery || (delivery === 'instant' ? product.instantMinutes != null : product.shipping)) &&
    [product.name, product.brand, product.variety, product.seller].filter(Boolean)
      .some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  const selected = products.filter(product => bag[product.id]);
  const count = Object.values(bag).reduce((sum, quantity) => sum + quantity, 0);
  const availableIds = new Set(selected.map(product => product.id));
  const unavailable = Object.keys(bag).filter(id => !availableIds.has(id));
  const total = selected.reduce((sum, product) => sum + bag[product.id] * product.pricePaise, 0);

  function change(id, amount) {
    setBag(current => {
      const next = { ...current };
      const quantity = Math.min(99, (current[id] || 0) + amount);
      if (quantity > 0) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }

  function browseCategory(next) {
    setCategory(next);
    setBrand('');
    setDelivery('');
    setQuery('');
    window.location.hash = 'browse';
    document.getElementById('browse')?.scrollIntoView();
  }

  function repeatOrder() {
    const ids = new Set(products.map(product => product.id));
    const eligible = lastOrder.filter(item => ids.has(item.id));
    if (!eligible.length) {
      setShoppingNotice('None of the items in your last order are available here.');
      return;
    }
    setBag(current => {
      const next = { ...current };
      for (const { id, quantity } of eligible) next[id] = Math.min(99, (next[id] || 0) + quantity);
      return next;
    });
    setShoppingNotice(eligible.length === lastOrder.length
      ? 'Items from your last order were added to your bag.'
      : 'Available items from your last order were added to your bag.');
  }

  return <div className="store">
    <StoreHeader customer={customer} count={count} homeHref={homeHref} bagHref={bagHref} accountHref={accountHref} />
    <main>
      {demoFallback && <p className="catalogue-status" role="status">
        Showing the demo catalogue while the service reconnects. Checkout is unavailable.
      </p>}
      {!bagPage && <section className="delivery-summary" aria-label="Delivery estimate">
        <div><p>{area ? 'Delivering to' : 'Delivery location'}</p>
          <strong>{area?.name || 'Choose your area'}</strong></div>
        {instantEstimate && <div className="delivery-estimate"><strong>{instantEstimate}</strong><span>Instant delivery estimate</span></div>}
        {area && !instantEstimate && products.some(product => product.shipping) &&
          <div className="delivery-estimate"><span>Standard shipping available</span></div>}
      </section>}
      {locations.length > 0 && <form className="location-form" action={bagPage ? "/bag" : "/"}>
        <label htmlFor="location">Delivery location</label>
        <select id="location" name="location" defaultValue={locationId}>
          <option value="">Browse all locations</option>
          {locations.map(area => <option key={area.id} value={area.id}>
            {area.city} / {area.town} / {area.name}
          </option>)}
        </select>
        <button type="submit">Update</button>
      </form>}
      {!bagPage && <>
      <div className="store-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" aria-label="Search groceries" placeholder="Search groceries"
          disabled={Boolean(catalogueState)} value={query} onChange={event => setQuery(event.target.value)} />
        <VoiceSearch disabled={Boolean(catalogueState)} onSearch={transcript => {
          setCategory('All');
          setBrand('');
          setDelivery('');
          setQuery(transcript);
          window.location.hash = 'browse';
        }} />
      </div>
      {!catalogueState && <nav className="quick-categories" aria-label="Quick categories">
        {categories.map(item => <button type="button" key={item} onClick={() => browseCategory(item)}>
          <span aria-hidden="true">{icons[item] || '🛒'}</span>{item}
        </button>)}
      </nav>}
      {showOffers && <section className="hero">
        <div><p>Flickit Grocery</p><h1>Everyday groceries,<br />delivered.</h1>
          <a className="shop-action" href="#browse">Shop groceries</a></div>
        <div className="hero-visual" aria-hidden="true"><span>🥑</span><span>🛍️</span><span>🍊</span></div>
      </section>}
      {!catalogueState && categories.length > 1 && <section className="collections" aria-labelledby="collections-title">
        <div className="row"><h2 id="collections-title">Shop essentials</h2>
          {lastOrder.length > 0 && <button type="button" disabled={!bagLoaded} onClick={repeatOrder}>Order again</button>}
        </div>
        {shoppingNotice && <p role="status">{shoppingNotice} <a href={bagHref}>View bag</a></p>}
        <div className="collection-grid">
          {categories.slice(1).map(item => {
            const collection = products.filter(product => product.category === item);
            return <button type="button" className="collection-card" key={item} onClick={() => browseCategory(item)}>
              <span className="collection-art" aria-hidden="true">
                {collection.slice(0, 4).map(product => <span key={product.id}>
                  {productIcons[product.id] || icons[item] || '🛒'}
                </span>)}
              </span>
              <strong>{item}</strong>
              <span>{collection.length} {collection.length === 1 ? 'item' : 'items'}</span>
            </button>;
          })}
        </div>
      </section>}
      <section id="browse" aria-labelledby="browse-title">
      <h2 id="browse-title">Shop by category</h2>
      {catalogueState ? <CatalogueStatus state={catalogueState} /> : <>
      <nav className="category-nav" aria-label="Product categories">{categories.map(item =>
        <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>
          <span aria-hidden="true">{icons[item] || '🛒'}</span>{item}</button>
      )}</nav>
      <div className="filters">
        {brands.length > 0 && <label>Brand <select value={brand} onChange={event => setBrand(event.target.value)}>
          <option value="">All brands</option>
          {brands.map(item => <option key={item}>{item}</option>)}
        </select></label>}
        {locationId && <label>Delivery <select value={delivery} onChange={event => setDelivery(event.target.value)}>
          <option value="">All options</option>
          <option value="instant">Instant delivery</option>
          <option value="shipping">Standard shipping</option>
        </select></label>}
      </div>
      <section className="grid" aria-label="Products">
        {visible.map(product => <article className="product-card" key={product.id}>
          <div className="product-art" aria-hidden="true">{productIcons[product.id] || icons[product.category] || '🛒'}</div>
          <h2>{product.name}</h2>
          <p className="product-meta">{[product.brand, product.pack].filter(Boolean).join(' · ')}</p>
          {product.variety && product.variety !== product.pack && <p>{product.variety}</p>}
          {product.seller && <p>Sold by {product.seller}</p>}
          {product.instantMinutes != null && <p className="eta">Estimated {product.instantMinutes} min</p>}
          {product.shipping && <p>Standard shipping available</p>}
          <div className="row"><strong>{price(product.pricePaise)}</strong>
            <button aria-label={`Add ${product.name}`} className="add-product" disabled={!bagLoaded} onClick={() => change(product.id, 1)}>{bag[product.id] ? `+ · ${bag[product.id]}` : 'Add +'}</button></div>
        </article>)}
      </section>
      {visible.length === 0 && <p>{products.length ? 'No groceries match your search.' : 'No groceries are available here yet.'}</p>}
      </>}
      </section>
      </>}
      {bagPage && <section id="bag"><h1>Your bag</h1>
        <a href={`${homeHref}#browse`}>Continue shopping</a>
        {receipt && <p role="status">Order confirmed. Reference <strong>{receipt.reference}</strong>.
          Pay {price(receipt.totalPaise)} on delivery.</p>}
        {catalogueState ? <CatalogueStatus state={catalogueState} /> :
          !bagLoaded ? <p role="status">Loading your bag…</p> :
          count === 0 ? <p>Your bag is empty.</p> : <>
          <ul>{selected.map(product => <li className="row" key={product.id}>
            <span>{product.name} × {bag[product.id]}</span>
            <button aria-label={`Remove one ${product.name}`} onClick={() => change(product.id, -1)}>Remove one</button>
          </li>)}</ul>
          {unavailable.length > 0 && <ul>{unavailable.map(id => <li className="row" key={id}>
            <span>Item unavailable for this delivery area</span>
            <button onClick={() => change(id, -bag[id])}>Remove unavailable item</button>
          </li>)}</ul>}
          <strong>Subtotal {price(total)}</strong>
          {unavailable.length > 0 ? <p>Remove unavailable items to check out.</p> : !checkoutAvailable ? <p>Checkout is currently unavailable.</p> : !locationId
            ? <p>Choose your delivery location to check out.</p>
            : <Checkout locationId={locationId} selected={selected} bag={bag} totalPaise={total}
                onOrder={order => {
                  const items = order.items.map(({ id, quantity }) => ({ id, quantity }));
                  setLastOrder(items);
                  try {
                    sessionStorage.setItem(lastOrderKey, JSON.stringify(items));
                    if (customer) sessionStorage.setItem(`flickit.last-order-summary.${customer.id}`, JSON.stringify({
                      reference: order.reference, totalPaise: order.totalPaise,
                    }));
                  } catch {}
                  setReceipt(order);
                  setBag({});
                }} />}
        </>}
      </section>}
    </main>
    <nav className="bottom-appbar" aria-label="Shopping shortcuts">
      {[['home', 'Home', homeHref], ['bag', 'Bag', bagHref], ['browse', 'Categories', `${homeHref}#browse`]]
        .map(([id, label, href]) =>
          <a href={href} key={id} aria-current={(bagPage ? 'bag' : shortcut) === id ? 'location' : undefined}
            aria-label={id === 'bag' ? `Bag, ${count} items` : undefined}>
            <span className="appbar-icon"><Icon name={id} />
              {id === 'bag' && count > 0 && <span className="appbar-count" aria-hidden="true">{count}</span>}
            </span>
            <span>{label}</span>
          </a>)}
      <a href={accountHref}>
        <span className="appbar-icon"><Icon name="user" /></span><span>Account</span>
      </a>
    </nav>
  </div>;
}
