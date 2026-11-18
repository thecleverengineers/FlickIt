'use client';

import { useState } from 'react';

const currency = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });
const icons = { Produce: '🥬', Dairy: '🥛', Pantry: '🌾' };
const price = paise => currency.format(paise / 100);

export default function Store({ products, locationSelected }) {
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

  return <>
    <header><a href="/" className="brand"><img src="/flickit-logo.png" alt="Flickit" width="2172" height="724" /></a><a href="#bag">Bag ({count})</a></header>
    <main>
      <section className="hero"><p>Dimapur, Nagaland</p><h1>Everyday groceries</h1>
        <input type="search" aria-label="Search groceries" placeholder="Search groceries"
          value={query} onChange={event => setQuery(event.target.value)} /></section>
      <nav aria-label="Product categories">{categories.map(item =>
        <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
      )}</nav>
      <div className="filters">
        {brands.length > 0 && <label>Brand <select value={brand} onChange={event => setBrand(event.target.value)}>
          <option value="">All brands</option>
          {brands.map(item => <option key={item}>{item}</option>)}
        </select></label>}
        {locationSelected && <label>Delivery <select value={delivery} onChange={event => setDelivery(event.target.value)}>
          <option value="">All options</option>
          <option value="instant">Instant delivery</option>
          <option value="shipping">Standard shipping</option>
        </select></label>}
      </div>
      <section className="grid" aria-label="Products">
        {visible.map(product => <article key={product.id}>
          <div className="icon" aria-hidden="true">{icons[product.category] || '🛒'}</div>
          <h2>{product.name}</h2>
          <p>{[product.brand, product.pack].filter(Boolean).join(' · ')}</p>
          {product.variety && product.variety !== product.pack && <p>{product.variety}</p>}
          {product.seller && <p>Sold by {product.seller}</p>}
          {product.instantMinutes != null && <p>Estimated {product.instantMinutes} min</p>}
          {product.shipping && <p>Standard shipping available</p>}
          <div className="row"><strong>{price(product.pricePaise)}</strong>
            <button aria-label={`Add ${product.name}`} onClick={() => change(product.id, 1)}>Add</button></div>
        </article>)}
      </section>
      {visible.length === 0 && <p>No groceries match your search.</p>}
      <section id="bag"><h2>Your bag</h2>
        {count === 0 ? <p>Your bag is empty.</p> : <>
          <ul>{selected.map(product => <li className="row" key={product.id}>
            <span>{product.name} × {bag[product.id]}</span>
            <button aria-label={`Remove one ${product.name}`} onClick={() => change(product.id, -1)}>Remove one</button>
          </li>)}</ul>
          <strong>Subtotal {price(total)}</strong>
        </>}
      </section>
    </main>
  </>;
}
