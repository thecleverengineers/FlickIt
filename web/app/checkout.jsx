'use client';

import { useRef, useState } from 'react';

export default function Checkout({ locationId, selected, bag, totalPaise, onOrder }) {
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);
  const pending = useRef(null);
  const methods = [
    ['instant', 'Instant delivery', selected.every(item => item.instantMinutes != null)],
    ['shipping', 'Standard shipping', selected.every(item => item.shipping)],
  ].filter(method => method[2]);

  async function submit(event) {
    event.preventDefault();
    if (working) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const input = {
      ...fields, locationId, totalPaise,
      items: selected.map(({ id }) => ({ id, quantity: bag[id] })),
    };
    const fingerprint = JSON.stringify(input);
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, id: crypto.randomUUID() };
    }
    setWorking(true);
    setStatus('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, requestId: pending.current.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onOrder(result.order);
    } catch (error) {
      setStatus(error.message || 'Could not confirm your order. Please retry.');
    } finally {
      setWorking(false);
    }
  }

  if (!methods.length) return <p>Your bag contains items that require different delivery options.</p>;

  return <form onSubmit={submit}>
    <fieldset disabled={working} className="checkout-fields">
      <legend>Cash on delivery</legend>
      <label>Name<input name="name" minLength={2} maxLength={100} required autoComplete="name" /></label>
      <label>Mobile number<input name="phone" type="tel" required autoComplete="tel" /></label>
      <label>Delivery address<input name="address" minLength={10} maxLength={400} required autoComplete="street-address" /></label>
      <label>Delivery method<select name="delivery">
        {methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button>{working ? 'Placing order…' : 'Place COD order'}</button>
    </fieldset>
    {status && <p role="status">{status}</p>}
  </form>;
}
