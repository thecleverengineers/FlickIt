'use client';

import { useState } from 'react';

const nextAction = { confirmed: 'Mark packing', packing: 'Mark dispatched', dispatched: 'Mark delivered' };
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function Orders({ token }) {
  const [orders, setOrders] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function request(receipt) {
    setWorking(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders', {
        method: receipt ? 'PATCH' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: receipt ? JSON.stringify({ reference: receipt.reference, status: receipt.status }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!receipt) setOrders(result.orders);
      else setOrders(current => current.map(order => order.receipt.reference === receipt.reference
        ? { ...order, receipt: { ...order.receipt, status: result.status } } : order));
    } catch (err) {
      setError(err.message || 'Orders are unavailable.');
    } finally {
      setWorking(false);
    }
  }

  return <section aria-label="Recent orders">
    <button disabled={working} onClick={() => void request()}>Load recent orders</button>
    {error && <p role="status">{error}</p>}
    {orders?.length === 0 && <p>No orders yet.</p>}
    {orders?.map(({ receipt, deliveryAddress }) => <article className="admin-record" key={receipt.reference}>
      <h2>{receipt.reference}</h2>
      <p>{receipt.status} · {receipt.delivery} · COD {currency.format(receipt.totalPaise / 100)}</p>
      <p>{deliveryAddress.name} · {deliveryAddress.phone} · {deliveryAddress.address}</p>
      <ul>{receipt.items.map(item => <li key={item.id}>{item.name} × {item.quantity}</li>)}</ul>
      {nextAction[receipt.status] && <button disabled={working}
        onClick={() => void request(receipt)}>{nextAction[receipt.status]}</button>}
    </article>)}
  </section>;
}
