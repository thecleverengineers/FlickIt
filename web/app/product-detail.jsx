'use client';

import { useState } from 'react';
import CategoryIcon from './category-icon';
import { Icon } from './store-header';

function ProductPhoto({ product }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed
    ? <img src={product.imageUrl} alt={product.name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <CategoryIcon name={product.category} />;
}

export default function ProductDetail({ product, related, categoryUrl, searchUrl, bagHref, productHref, bag, count, bagLoaded, change, price }) {
  const [notice, setNotice] = useState('');
  const quantity = bag[product.id] || 0;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Product link copied.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') setNotice('Could not share the product link.');
    }
  }

  return <article className="pdp">
    <div className="pdp-hero"><ProductPhoto key={product.id} product={product} /></div>
    <nav className="pdp-tools" aria-label="Product navigation">
      <a href={categoryUrl} aria-label="Back to category">←</a>
      <span />
      <a href={searchUrl} aria-label="Search groceries"><Icon name="search" /></a>
      <button type="button" onClick={share} aria-label="Share product"><Icon name="share" /></button>
    </nav>
    {notice && <p className="pdp-notice" role="status">{notice}</p>}
    <section className="pdp-panel">
      {product.instantMinutes != null && <p className="pdp-meta">Estimated delivery · {product.instantMinutes} min</p>}
      {product.shipping && <p className="pdp-meta">Standard shipping available</p>}
      <h1>{product.name}</h1>
      {product.pack && <p className="pdp-pack">{product.pack}</p>}
      <strong className="pdp-price">{price(product.pricePaise)}</strong>
      {product.brand && <p className="pdp-meta">{product.brand}</p>}
    </section>
    {(product.description || product.seller || (product.variety && product.variety !== product.pack)) &&
      <details className="pdp-panel pdp-information">
        <summary>Product information</summary>
        {product.description && <p>{product.description}</p>}
        {product.variety && product.variety !== product.pack && <p>{product.variety}</p>}
        {product.seller && <p>Sold by {product.seller}</p>}
      </details>}
    {related.length > 0 && <section className="pdp-panel">
      <h2>Similar products</h2>
      <div className="pdp-related">
        {related.map(item => <article key={item.id}>
          <a href={productHref(item.id)} className="pdp-related-photo"><ProductPhoto product={item} /></a>
          <div className="pdp-related-actions"><small>{item.pack}</small>
            {!item.preview && <button type="button" aria-label={`Add ${item.name}`}
              disabled={!bagLoaded || (bag[item.id] || 0) >= 99} onClick={() => change(item.id, 1)}>
              {bag[item.id] ? `Add · ${bag[item.id]}` : 'Add'}
            </button>}
          </div>
          <strong>{price(item.pricePaise)}</strong>
          <a href={productHref(item.id)}>{item.name}</a>
        </article>)}
      </div>
      <a className="pdp-all" href={categoryUrl}>See all products →</a>
    </section>}
    {count > 0 && <a className="pdp-bag" href={bagHref}><Icon name="bag" /><span><strong>View bag</strong><small>{count} {count === 1 ? 'item' : 'items'}</small></span>›</a>}
    <footer className="pdp-dock">
      <div>{product.pack && <small>{product.pack}</small>}<strong>{price(product.pricePaise)}</strong></div>
      {product.preview ? <span>Preview only</span> : quantity > 0 ? <div className="bag-stepper" role="group" aria-label="Product quantity">
        <button type="button" aria-label="Remove one" onClick={() => change(product.id, -1)}>−</button>
        <output aria-label="Quantity">{quantity}</output>
        <button type="button" aria-label="Add one" disabled={quantity >= 99} onClick={() => change(product.id, 1)}>+</button>
      </div> : <button className="add-product" type="button" disabled={!bagLoaded} onClick={() => change(product.id, 1)}>Add to bag</button>}
    </footer>
  </article>;
}
