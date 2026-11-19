'use client';

import { useEffect, useState } from 'react';
import Checkout from './checkout';
import StoreHeader, { Icon } from './store-header';
import CatalogueStatus from './catalogue-status';
import CategoryDirectory from './category-directory';
import CategoryIcon from './category-icon';
import VoiceSearch from './voice-search';

const currency = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });
const icons = { Produce: '🥬', Dairy: '🥛', Pantry: '🌾' };
const productIcons = { banana: '🍌', tomato: '🍅', milk: '🥛', curd: '🥣', rice: '🍚', dal: '🫘' };
const lastOrderKey = 'flickit.last-order-items';
const bagKey = 'flickit.shopping-bag';
const price = paise => currency.format(paise / 100);

export default function Store({ products, locations, locationId, checkoutAvailable, catalogueState, bagPage, categoriesPage, initialCategory, demoFallback, customer }) {
  const locationQuery = locationId ? `?${new URLSearchParams({ location: locationId })}` : '';
  const homeHref = `/${locationQuery}`;
  const categoriesHref = `/categories${locationQuery}`;
  const accountHref = `/account${locationQuery}`;
  const bagHref = `/bag${locationQuery}`;

  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(() => categoriesPage && products.some(product => product.category === initialCategory) ? initialCategory : 'All');
  const [sort, setSort] = useState('');
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
  const categoryProducts = category === 'All' ? products : products.filter(product => product.category === category);
  const categoryDetail = categoriesPage && category !== 'All' && !catalogueState;
  const brands = [...new Set(categoryProducts.map(product => product.brand).filter(Boolean))];
  const visible = categoryProducts.filter(product =>
    (!brand || product.brand === brand) &&
    (!delivery || (delivery === 'instant' ? product.instantMinutes != null : product.shipping)) &&
    [product.name, product.brand, product.variety, product.seller, product.description].filter(Boolean)
      .some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  if (sort === 'price-low') visible.sort((a, b) => a.pricePaise - b.pricePaise);
  if (sort === 'price-high') visible.sort((a, b) => b.pricePaise - a.pricePaise);
  const categoryHref = item => `/categories?${new URLSearchParams({ category: item, ...(locationId ? { location: locationId } : {}) })}`;
  const selected = products.filter(product => !product.preview && bag[product.id]);
  const count = Object.values(bag).reduce((sum, quantity) => sum + quantity, 0);
  const availableIds = new Set(selected.map(product => product.id));
  const unavailable = Object.keys(bag).filter(id => !availableIds.has(id));
  const suggestions = bagPage && selected.length
    ? products.filter(product => !product.preview && product.imageUrl && !bag[product.id]).slice(0, 6)
    : [];
  const canCheckout = checkoutAvailable && locationId && !unavailable.length &&
    (selected.every(item => item.instantMinutes != null) || selected.every(item => item.shipping));
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
    if (next !== 'All') {
      window.location.assign(categoryHref(next));
      return;
    }
    setCategory(next);
    setBrand('');
    setDelivery('');
    setQuery('');
    window.location.hash = 'browse';
    document.getElementById('browse')?.scrollIntoView();
  }

  function repeatOrder() {
    const ids = new Set(products.filter(product => !product.preview).map(product => product.id));
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

  return <div className={bagPage ? "store bag-store" : categoryDetail ? "store categories-store category-detail-store" : categoriesPage ? "store categories-store" : "store"}>
    {bagPage ? <header className="checkout-bar">
      <a href={homeHref} aria-label="Back to shop">←</a>
      <strong>Checkout</strong>
      <a href={`${homeHref}#browse`} aria-label="Browse products"><Icon name="browse" /></a>
      {bagLoaded && typeof navigator !== 'undefined' && navigator.share && <button type="button"
        onClick={() => navigator.share({ title: 'Flickit', url: window.location.origin }).catch(() => {})}>Share</button>}
    </header> : categoryDetail ? <header className="checkout-bar category-detail-bar">
      <a href={categoriesHref} aria-label="Back to categories">←</a>
      <div><strong>{category}</strong><small>{area ? `Delivering to ${area.name}` : 'Browse available products'}</small></div>
      <a href="#category-search" aria-label="Search this category">⌕</a>
    </header> : <StoreHeader customer={customer} count={count} homeHref={homeHref} bagHref={bagHref} accountHref={accountHref} />}
    <main>
      {demoFallback && <p className="catalogue-status" role="status">
        Showing the demo catalogue while the service reconnects. Checkout is unavailable.
      </p>}
      {!bagPage && !categoryDetail && <section className="delivery-summary" aria-label="Delivery estimate">
        <div><p>{area ? 'Delivering to' : 'Delivery location'}</p>
          <strong>{area?.name || 'Choose your area'}</strong></div>
        {instantEstimate && <div className="delivery-estimate"><strong>{instantEstimate}</strong><span>Instant delivery estimate</span></div>}
        {area && !instantEstimate && products.some(product => product.shipping) &&
          <div className="delivery-estimate"><span>Standard shipping available</span></div>}
      </section>}
      {!categoryDetail && locations.length > 0 && <form className="location-form" action={bagPage ? "/bag" : categoriesPage ? "/categories" : "/"}>
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
      {categoriesPage && !categoryDetail && <h1 className="categories-title">Categories</h1>}
      <div className="store-search" id="category-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" aria-label="Search groceries" placeholder="Search groceries"
          disabled={Boolean(catalogueState)} value={query} onChange={event => setQuery(event.target.value)} />
        <VoiceSearch disabled={Boolean(catalogueState)} onSearch={transcript => {
          if (!categoryDetail) setCategory('All');
          setBrand('');
          setDelivery('');
          setQuery(transcript);
          window.location.hash = 'browse';
        }} />
      </div>
      {!categoriesPage && !catalogueState && <nav className="quick-categories" aria-label="Quick categories">
        {categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => browseCategory(item)}>
          <CategoryIcon name={item} /><span className="quick-category-label">{item}</span>
        </button>)}
      </nav>}
      {!categoriesPage && showOffers && <section className="hero">
        <div><p>Flickit Grocery</p><h1>Everyday groceries,<br />delivered.</h1>
          <a className="shop-action" href="#browse">Shop groceries</a></div>
        <div className="hero-visual" aria-hidden="true"><span>🥑</span><span>🛍️</span><span>🍊</span></div>
      </section>}
      {!categoriesPage && !catalogueState && categories.length > 1 && <section className="collections" aria-labelledby="collections-title">
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
      {categoriesPage && !catalogueState && category === 'All' && !query.trim() && categories.length > 1 &&
        <CategoryDirectory categories={categories.slice(1)} products={products} onSelect={browseCategory} />}
      {(!categoriesPage || catalogueState || category !== 'All' || query.trim() || categories.length === 1) &&
      <section id="browse" aria-labelledby="browse-title" className={categoryDetail ? 'category-detail-layout' : undefined}>
      {categoryDetail && <nav className="category-side-rail" aria-label="Categories">
        {categories.slice(1).map(item => <a href={categoryHref(item)} key={item} aria-current={category === item ? 'page' : undefined}>
          <CategoryIcon name={item} /><span>{item}</span>
        </a>)}
      </nav>}
      <div className={categoryDetail ? 'category-detail-results' : undefined}>
      <h2 id="browse-title" className={categoryDetail ? "category-detail-title" : undefined}>{categoriesPage && category !== 'All' ? category : categoriesPage && query.trim() ? 'Search results' : 'Shop by category'}</h2>
      {categoriesPage && !categoryDetail && (category !== 'All' || query.trim()) && <button type="button" onClick={() => {
        setCategory('All'); setQuery(''); setBrand(''); setDelivery('');
      }}>← All categories</button>}
      {catalogueState ? <CatalogueStatus state={catalogueState} /> : <>
      {!categoryDetail && <nav className="category-nav" aria-label="Product categories">{categories.map(item =>
        <button key={item} aria-pressed={category === item} onClick={() => browseCategory(item)}>
          <span aria-hidden="true">{icons[item] || '🛒'}</span>{item}</button>
      )}</nav>}
      <div className="filters">
        {categoryDetail && <label>Sort <select value={sort} onChange={event => setSort(event.target.value)}>
          <option value="">Recommended</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option>
        </select></label>}
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
          {product.imageUrl ? <div className="product-art product-photo">
            <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async"
              referrerPolicy="no-referrer" onError={event => {
                event.currentTarget.hidden = true;
                event.currentTarget.nextElementSibling.hidden = false;
              }} />
            <span hidden aria-hidden="true">{productIcons[product.id] || icons[product.category] || '🛒'}</span>
          </div> : <div className="product-art" aria-hidden="true">{productIcons[product.id] || icons[product.category] || '🛒'}</div>}
          <h2>{product.name}</h2>
          <p className="product-meta">{[product.brand, product.pack].filter(Boolean).join(' · ')}</p>
          {product.variety && product.variety !== product.pack && <p>{product.variety}</p>}
          {product.description && <details className="product-details">
            <summary>Product details</summary><p>{product.description}</p>
          </details>}
          {product.seller && <p>Sold by {product.seller}</p>}
          {product.instantMinutes != null && <p className="eta">Estimated {product.instantMinutes} min</p>}
          {product.shipping && <p>Standard shipping available</p>}
          {product.preview ? <p className="eta">Preview · not for sale</p> :
          <div className="row"><strong>{price(product.pricePaise)}</strong>
            <button aria-label={`Add ${product.name}`} className="add-product" disabled={!bagLoaded} onClick={() => change(product.id, 1)}>{bag[product.id] ? `+ · ${bag[product.id]}` : 'Add +'}</button></div>}
        </article>)}
      </section>
      {visible.length === 0 && <p>{products.length ? 'No groceries match your search.' : 'No groceries are available here yet.'}</p>}
      </>}
      </div>
      </section>}
      </>}
      {bagPage && <section className="bag-page" aria-labelledby="bag-title">
        <header className="bag-heading">
          <a className="bag-back" href={`${homeHref}#browse`}>← Continue shopping</a>
          <h1 id="bag-title">Your bag</h1>
          {bagLoaded && count > 0 && <p>{count} {count === 1 ? 'item' : 'items'}</p>}
        </header>
        {receipt && <p className="bag-panel" role="status">Order confirmed. Reference <strong>{receipt.reference}</strong>.
          Pay {price(receipt.totalPaise)} on delivery.</p>}
        {catalogueState ? <CatalogueStatus state={catalogueState} /> :
          !bagLoaded ? <p role="status">Loading your bag…</p> :
          count === 0 ? <div className="bag-panel bag-empty">
            <span className="bag-empty-icon"><Icon name="bag" /></span>
            <h2>Your bag is empty</h2>
            <a className="bag-shop" href={`${homeHref}#browse`}>Browse groceries</a>
          </div> : <div className="bag-layout">
          <section className="bag-panel checkout-shipment" aria-labelledby="shipment-title">
          <h2 id="shipment-title">{area ? area.name : 'Items in your bag'}</h2>
          <p>{count} {count === 1 ? 'item' : 'items'}</p>
          <ul className="bag-items" aria-label="Bag items">
            {selected.map(product => <li className="bag-item" key={product.id}>
              <span className="bag-photo">{product.imageUrl
                ? <img src={product.imageUrl} alt="" width="72" height="72" loading="lazy" />
                : <Icon name="bag" />}</span>
              <div className="bag-item-info">
                <h2>{product.name}</h2>
                {product.pack && <p>{product.pack}</p>}
              </div>
              <div className="bag-line-price">
                <span>{price(product.pricePaise)} × {bag[product.id]}</span>
                <strong aria-label={`Item total ${price(product.pricePaise * bag[product.id])}`}>
                  {price(product.pricePaise * bag[product.id])}
                </strong>
              </div>
              <div className="bag-stepper" role="group" aria-label={`Quantity for ${product.name}`}>
                <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => change(product.id, -1)}>−</button>
                <output aria-label="Quantity">{bag[product.id]}</output>
                <button type="button" aria-label={`Add one ${product.name}`} disabled={bag[product.id] >= 99}
                  onClick={() => change(product.id, 1)}>+</button>
              </div>
            </li>)}
            {unavailable.map(id => <li className="bag-unavailable" key={id}>
              <span>Item unavailable for this delivery area</span>
              <button type="button" onClick={() => change(id, -bag[id])}>Remove</button>
            </li>)}
          </ul>
          </section>
          {suggestions.length > 0 && <section className="bag-panel checkout-suggestions" aria-labelledby="suggestions-title">
            <h2 id="suggestions-title">You might also like</h2>
            <div className="checkout-product-grid">
              {suggestions.map(product => <div key={product.id} className="checkout-product">
                <img src={product.imageUrl} alt="" width="132" height="132" loading="lazy" />
                <div className="checkout-product-actions"><small>{product.pack}</small>
                  <button type="button" aria-label={`Add ${product.name}`} onClick={() => change(product.id, 1)}>Add</button>
                </div>
                <strong>{price(product.pricePaise)}</strong>
                <p>{product.name}</p>
              </div>)}
            </div>
            <a className="checkout-browse" href={`${homeHref}#browse`}>See all products →</a>
          </section>}
          <section id="checkout-details" className="bag-panel bag-summary" aria-labelledby="bag-summary-title">
          <h2 id="bag-summary-title">Bill details</h2>
          <div className="checkout-bill-row"><span>Items total</span><span>{price(total)}</span></div>
          <div className="bag-subtotal"><span>{canCheckout ? 'Grand total' : 'Subtotal'}</span><strong>{price(total)}</strong></div>
          {unavailable.length > 0 ? <p>Remove unavailable items to check out.</p> : !checkoutAvailable ? <p>Checkout is currently unavailable.</p> : !locationId
            ? <p><a href={homeHref}>Choose a delivery location</a> to check out.</p>
            : <Checkout locationId={locationId} selected={selected} bag={bag} totalPaise={total}
                onOrder={order => {
                  const items = order.items.map(({ id, quantity }) => ({ id, quantity }));
                  setLastOrder(items);
                  try {
                    sessionStorage.setItem(lastOrderKey, JSON.stringify(items));
                  } catch {}
                  setReceipt(order);
                  setBag({});
                }} />}
          </section>
        </div>}
      </section>}
    </main>
    {bagPage && bagLoaded && !catalogueState && count > 0 && <footer className="checkout-dock">
      <div><small>Items subtotal</small><strong>{price(total)}</strong></div>
      {canCheckout ? <a href="#checkout-details">Choose address</a> :
        checkoutAvailable && !locationId ? <a href={homeHref}>Choose delivery area</a> :
        <button type="button" disabled>Checkout unavailable</button>}
    </footer>}
    {categoriesPage && count > 0 && <a className="category-view-bag" href={bagHref}>
      <Icon name="bag" /><span><strong>View bag</strong><small>{count} {count === 1 ? 'item' : 'items'}</small></span><span aria-hidden="true">›</span>
    </a>}
    {!bagPage && <nav className="bottom-appbar" aria-label="Shopping shortcuts">
      {[['home', 'Home', homeHref], ['bag', 'Bag', bagHref], ['browse', 'Categories', categoriesHref]]
        .map(([id, label, href]) =>
          <a href={href} key={id} aria-current={(categoriesPage ? 'browse' : 'home') === id ? 'location' : undefined}
            aria-label={id === 'bag' ? `Bag, ${count} items` : undefined}>
            <span className="appbar-icon"><Icon name={id} />
              {id === 'bag' && count > 0 && <span className="appbar-count" aria-hidden="true">{count}</span>}
            </span>
            <span>{label}</span>
          </a>)}
      <a href={accountHref}>
        <span className="appbar-icon"><Icon name="user" /></span><span>Account</span>
      </a>
    </nav>}
  </div>;
}
