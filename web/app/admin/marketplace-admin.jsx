'use client';

import { useState } from 'react';

const sections = {
  locations: { title: 'Delivery areas', fields: { name: 'Area', city: 'City', town: 'Town' } },
  sellers: { title: 'Sellers', fields: { name: 'Name' } },
  warehouses: { title: 'Warehouses', fields: {
    sellerId: 'Seller', locationIds: 'Instant delivery areas', instantMinutes: 'Instant estimate in minutes',
    shipping: 'Standard shipping',
  } },
  listings: { title: 'Listings', fields: {
    name: 'Name', category: 'Category', brand: 'Brand', variety: 'Variety', pack: 'Pack',
    warehouseId: 'Warehouse', stock: 'Stock units', pricePaise: 'Price in paise',
  } },
};

const defaults = {
  locations: { name: '', city: '', town: '' },
  sellers: { name: '' },
  warehouses: { sellerId: '', locationIds: [], instantMinutes: null, shipping: false },
  listings: { name: '', category: '', brand: '', variety: '', pack: '', warehouseId: '', stock: 0, pricePaise: 0 },
};

const empty = { locations: [], sellers: [], warehouses: [], listings: [], paymentMethods: [] };

export default function MarketplaceAdmin() {
  const [token, setToken] = useState('');
  const [config, setConfig] = useState(null);
  const [section, setSection] = useState('locations');
  const [canSave, setCanSave] = useState(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');

  async function sync(method) {
    setWorking(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/marketplace', {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: method === 'PUT' ? JSON.stringify(config) : undefined,
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setConfig(result.config ?? empty);
      setCanSave(result.writable === true);
      setStatus(method === 'PUT' ? 'Marketplace settings saved.' :
        result.writable ? 'Marketplace settings loaded.' : 'Demo configuration loaded. Saving requires MongoDB.');
    } catch (error) {
      setStatus(error.message || 'Unable to update marketplace settings.');
    } finally {
      setWorking(false);
    }
  }

  function update(id, field, value) {
    setConfig(current => ({
      ...current, [section]: current[section].map(row => row.id === id ? { ...row, [field]: value } : row),
    }));
  }

  function remove(id) {
    const linked = (section === 'sellers' && config.warehouses.some(row => row.sellerId === id)) ||
      (section === 'locations' && config.warehouses.some(row => row.locationIds.includes(id))) ||
      (section === 'warehouses' && config.listings.some(row => row.warehouseId === id));
    if (linked) {
      setStatus('Remove the links to this record before removing it.');
      return;
    }
    setConfig(current => ({ ...current, [section]: current[section].filter(row => row.id !== id) }));
  }

  function fieldInput(row, field) {
    const value = row[field];
    const change = next => update(row.id, field, next);
    if (field === 'sellerId' || field === 'warehouseId' || field === 'locationIds') {
      const multiple = field === 'locationIds';
      const choices = config[{ sellerId: 'sellers', warehouseId: 'warehouses', locationIds: 'locations' }[field]];
      return <select multiple={multiple} value={value} onChange={event => change(multiple
        ? Array.from(event.target.selectedOptions, option => option.value) : event.target.value)}>
        {!multiple && <option value="">Select</option>}
        {choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name || choice.id}</option>)}
      </select>;
    }
    if (field === 'shipping') {
      return <input type="checkbox" checked={value} onChange={event => change(event.target.checked)} />;
    }
    if (['instantMinutes', 'stock', 'pricePaise'].includes(field)) {
      const instant = field === 'instantMinutes';
      return <input type="number" min={instant ? 30 : 0} max={instant ? 120 : undefined}
        placeholder={instant ? 'Disabled' : undefined} value={value ?? ''}
        onChange={event => change(event.target.value === '' ? null : Number(event.target.value))} />;
    }
    return <input value={value ?? ''} maxLength={120} onChange={event => change(event.target.value)} />;
  }

  return <>
    <form onSubmit={event => { event.preventDefault(); void sync('GET'); }} className="admin-actions">
      <label>Admin token<input type="password" value={token} required autoComplete="off" onChange={event => {
        setToken(event.target.value);
        setConfig(null);
        setStatus('');
      }} disabled={working} /></label>
      <button disabled={working || Boolean(config)}>Load settings</button>
    </form>
    <p role="status">{status}</p>
    {config && <fieldset disabled={working} className="admin-editor">
      <legend>Marketplace settings</legend>
      <nav aria-label="Marketplace sections">
        {[...Object.entries(sections).map(([key, value]) => [key, value.title]), ['payments', 'Payments']]
          .map(([key, label]) => <button key={key} aria-pressed={section === key} onClick={() => setSection(key)}>{label}</button>)}
      </nav>
      {section === 'payments' ? <div className="admin-grid">
        {[['cod', 'Cash on delivery'], ['online', 'Online payment']].map(([method, label]) =>
          <label key={method}>{label}<input type="checkbox" checked={config.paymentMethods.includes(method)}
            onChange={event => {
              const checked = event.target.checked;
              setConfig(current => ({ ...current, paymentMethods: checked
                ? [...current.paymentMethods, method] : current.paymentMethods.filter(item => item !== method) }));
            }} /></label>)}
        <p>These settings declare accepted payment methods. Checkout integration is pending.</p>
      </div> : <>
        <button onClick={() => {
          const id = crypto.randomUUID();
          setConfig(current => ({ ...current, [section]: [...current[section], { id, ...defaults[section] }] }));
        }}>Add record</button>
        {config[section].length === 0 && <p>No records yet.</p>}
        {config[section].map(row => <fieldset className="admin-record" key={row.id}>
          <legend>{row.name || row.id}</legend>
          <div className="admin-grid">
            {Object.entries(sections[section].fields).map(([field, label]) =>
              <label key={field}>{label}{fieldInput(row, field)}</label>)}
          </div>
          <button onClick={() => remove(row.id)}>Remove</button>
        </fieldset>)}
      </>}
      <div className="admin-actions">
        <button disabled={!canSave} onClick={() => void sync('PUT')}>Save marketplace settings</button>
      </div>
    </fieldset>}
  </>;
}
