'use client';

import { useState } from 'react';
import { Icon } from '../store-header';

const money = new Intl.NumberFormat('en-IN', { currency: 'INR', style: 'currency' });
const price = paise => money.format(paise / 100);
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

export default function OrderSummary({ order, catalogue, bagHref }) {
  const [notice, setNotice] = useState('');
  const [reviewBag, setReviewBag] = useState(false);
  const { receipt, createdAt, deliveryAddress } = order;
  const items = receipt.items ?? [];
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsTotal = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const payment = receipt.payment === 'cod' ? 'Cash on delivery' : receipt.payment;

  function downloadSummary() {
    const lines = [
      'Flickit order summary', `Order reference: ${receipt.reference}`,
      createdAt && `Placed: ${dateTime.format(new Date(createdAt))}`, `Status: ${receipt.status}`,
      payment && `Payment: ${payment}`, '',
      ...items.map(item => `${item.name} · ${item.quantity} × ${price(item.pricePaise)} = ${price(item.quantity * item.pricePaise)}`),
      '', `Bill total: ${price(receipt.totalPaise)}`,
    ];
    const url = URL.createObjectURL(new Blob([lines.filter(line => line !== undefined).join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `flickit-order-${receipt.reference}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function repeatOrder() {
    try {
      const eligible = items.filter(item => Object.hasOwn(catalogue, item.id));
      if (!eligible.length) {
        setNotice('No items from this order are currently available to add.');
        return;
      }
      const key = 'flickit.shopping-bag';
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}');
      const bag = Object.fromEntries(Object.entries(saved ?? {}).filter(([, quantity]) =>
        Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99));
      for (const item of eligible) {
        bag[item.id] = Math.min(99, (Object.hasOwn(bag, item.id) ? bag[item.id] : 0) + item.quantity);
      }
      sessionStorage.setItem(key, JSON.stringify(bag));
      if (eligible.length === items.length) window.location.assign(bagHref);
      else {
        setNotice('Available items were added. Some products are no longer available.');
        setReviewBag(true);
      }
    } catch {
      setNotice('Could not update your bag. Please try again.');
    }
  }

  return <div className="order-summary">
    <section className="order-summary-panel" aria-label="Order summary">
      <div className="order-summary-tools">
        <span className="order-status">{receipt.status.replaceAll('_', ' ')}</span>
        <button type="button" onClick={downloadSummary}>Download order summary ↓</button>
      </div>
      <h2>{units} {units === 1 ? 'item' : 'items'} in this order</h2>
      <ul className="order-products">
        {items.map(item => <li key={item.id}>
          <span className="order-photo">{Object.hasOwn(catalogue, item.id) && catalogue[item.id].imageUrl
            ? <img src={catalogue[item.id].imageUrl} alt="" width="52" height="52" /> : <Icon name="bag" />}</span>
          <div><strong>{item.name}</strong><p>{price(item.pricePaise)} × {item.quantity}</p></div>
          <strong>{price(item.pricePaise * item.quantity)}</strong>
        </li>)}
      </ul>
    </section>
    <section className="order-summary-panel">
      <h2>Bill details</h2>
      <dl className="order-bill">
        <div><dt>Items total</dt><dd>{price(itemsTotal)}</dd></div>
        <div><dt>Bill total</dt><dd>{price(receipt.totalPaise)}</dd></div>
      </dl>
    </section>
    <section className="order-summary-panel">
      <h2>Order details</h2>
      <dl className="order-facts">
        <div><dt>Order reference</dt><dd>{receipt.reference}</dd></div>
        {payment && <div><dt>Payment</dt><dd>{payment}</dd></div>}
        {deliveryAddress?.address && <div><dt>Deliver to</dt><dd>{deliveryAddress.address}</dd></div>}
        {createdAt && <div><dt>Order placed</dt><dd><time dateTime={createdAt}>{dateTime.format(new Date(createdAt))}</time></dd></div>}
      </dl>
    </section>
    <div className="order-repeat">
      {notice && <p role="status">{notice}</p>}
      {reviewBag ? <a href={bagHref}>Review bag</a> :
        <button type="button" onClick={repeatOrder} disabled={!items.length}>Repeat order <small>Review your bag before checkout</small></button>}
    </div>
  </div>;
}
