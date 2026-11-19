'use client';

import { useState } from 'react';
import Checkout from './checkout';

const currency = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });
const icons = { Produce: '🥬', Dairy: '🥛', Pantry: '🌾' };
const productIcons = { banana: '🍌', tomato: '🍅', milk: '🥛', curd: '🥣', rice: '🍚', dal: '🫘' };
const price = paise => currency.format(paise / 100);

export default function Store({ products, locations, locationId, checkoutAvailable }) {
  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [brand, setBrand] = useState('');
  const [delivery, setDelivery] = useState('');
  const [bag, setBag] = useState({});
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const brands = [...new Set(products.map(product => product.brand).filter(Boolean))];
  const visible = products.filter(product =>
    (category === 'All' || product.category === category) &&
    (!brand || product.brand === brand) &&
    (!delivery || (delivery === 'instant' ? product.instantMinutes != null : product.shipping)) &&
    [product.name, product.brand, product.variety, product.seller].filter(Boolean)
      .some(value => value.toLowerCase().includes(query.trim().toLowerCase())));
  const selected = products.filter(product => bag[product.id]);
  const count = selected.reduce((sum, product) => sum + bag[product.id], 0);
  const total = selected.reduce((sum, product) => sum + bag[product.id] * product.pricePaise, 0);

  function change(id, amount) {
    setBag(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + amount) }));
  }

  return <div className="store">
    <header className="store-header" id="home">
      <a href="/" className="brand"><img src="/flickit-logo.png" alt="Flickit" width="2172" height="724" /></a>
      <a href="#bag" className="bag-link">Bag <span>{count}</span></a>
    </header>
    <main>
      {locations.length > 0 && <form className="location-form" action="/">
        <label htmlFor="location">Delivery location</label>
        <select id="location" name="location" defaultValue={locationId}>
          <option value="">Browse all locations</option>
          {locations.map(area => <option key={area.id} value={area.id}>
            {area.city} / {area.town} / {area.name}
          </option>)}
        </select>
        <button type="submit">Update</button>
      </form>}
      <div className="store-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" aria-label="Search groceries" placeholder="Search groceries"
          value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      <section className="hero">
        <div><p>Flickit Grocery</p><h1>Everyday groceries,<br />delivered.</h1>
          <a className="shop-action" href="#browse">Shop groceries</a></div>
        <div className="hero-visual" aria-hidden="true"><span>🥑</span><span>🛍️</span><span>🍊</span></div>
      </section>
      <section id="browse" aria-labelledby="browse-title">
      <h2 id="browse-title">Shop by category</h2>
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
            <button aria-label={`Add ${product.name}`} className="add-product" onClick={() => change(product.id, 1)}>{bag[product.id] ? `+ · ${bag[product.id]}` : 'Add +'}</button></div>
        </article>)}
      </section>
      {visible.length === 0 && <p>No groceries match your search.</p>}
      </section>
      <section id="bag"><h2>Your bag</h2>
        {receipt && <p role="status">Order confirmed. Reference <strong>{receipt.reference}</strong>.
          Pay {price(receipt.totalPaise)} on delivery.</p>}
        {count === 0 ? <p>Your bag is empty.</p> : <>
          <ul>{selected.map(product => <li className="row" key={product.id}>
            <span>{product.name} × {bag[product.id]}</span>
            <button aria-label={`Remove one ${product.name}`} onClick={() => change(product.id, -1)}>Remove one</button>
          </li>)}</ul>
          <strong>Subtotal {price(total)}</strong>
          {!checkoutAvailable ? <p>Checkout is currently unavailable.</p> : !locationId
            ? <p>Choose your delivery location to check out.</p>
            : <Checkout locationId={locationId} selected={selected} bag={bag} totalPaise={total}
                onOrder={order => { setReceipt(order); setBag({}); }} />}
        </>}
      </section>
    </main>
    <nav className="shopping-dock" aria-label="Shopping shortcuts">
      <a href="#home">Home</a><a href="#browse">Browse</a><a href="#bag">Bag ({count})</a>
    </nav>
  </div>;
}
