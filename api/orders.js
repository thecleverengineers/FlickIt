import { createHash, randomUUID } from 'node:crypto';
import { getCatalogue } from './marketplace.js';

export class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function parseOrder(body) {
  const { requestId, locationId, name, phone, address, delivery, items, totalPaise } = body ?? {};
  const validText = (value, min, max) => typeof value === 'string' &&
    value.trim().length >= min && value.length <= max;
  if (!validText(requestId, 36, 36) || !/^[0-9a-f-]{36}$/i.test(requestId) ||
      !validText(locationId, 1, 120) || !validText(name, 2, 100) ||
      typeof phone !== 'string' || !/^(?:\+91)?[6-9]\d{9}$/.test(phone.trim()) ||
      !validText(address, 10, 400) || !['instant', 'shipping'].includes(delivery) ||
      !Number.isSafeInteger(totalPaise) || totalPaise < 0 ||
      !Array.isArray(items) || items.length < 1 || items.length > 50 ||
      !items.every(item => item && validText(item.id, 1, 120) &&
        Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99) ||
      new Set(items.map(item => item.id)).size !== items.length) {
    throw new OrderError(400, 'Check your delivery location, contact details and bag.');
  }
  return {
    requestId, locationId, name: name.trim(), phone: phone.trim(), address: address.trim(),
    delivery, totalPaise, items: items.map(({ id, quantity }) => ({ id, quantity })),
  };
}

export function priceOrder(config, input) {
  if (!config?.paymentMethods.includes('cod')) {
    throw new OrderError(409, 'Cash on delivery is unavailable.');
  }
  if (!config.locations.some(area => area.id === input.locationId)) {
    throw new OrderError(409, 'Choose an available delivery area.');
  }
  const offers = new Map(getCatalogue(config, input.locationId).map(offer => [offer.id, offer]));
  const inventory = new Map(config.listings.map(listing => [listing.id, listing.stock]));
  const items = input.items.map(({ id, quantity }) => {
    const offer = offers.get(id);
    if (!offer || inventory.get(id) < quantity ||
        (input.delivery === 'instant' ? offer.instantMinutes == null : !offer.shipping)) {
      throw new OrderError(409, 'One or more items are unavailable for this delivery option. Review your bag.');
    }
    inventory.set(id, inventory.get(id) - quantity);
    return { id, name: offer.name, quantity, pricePaise: offer.pricePaise };
  });
  const totalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  if (!Number.isSafeInteger(totalPaise)) throw new OrderError(409, 'The order total exceeds the supported limit.');
  if (totalPaise !== input.totalPaise) {
    throw new OrderError(409, 'Prices changed. Refresh the storefront and review your bag.');
  }
  const listings = config.listings.map(listing => ({ ...listing, stock: inventory.get(listing.id) }));
  return { items, totalPaise, listings };
}

export async function placeOrder(client, database, input) {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const orders = database.collection('orders');
  const settings = database.collection('settings');
  const reference = randomUUID();

  async function receiptForExisting(session) {
    const existing = await orders.findOne({ _id: input.requestId }, { session });
    if (!existing) return null;
    if (existing.fingerprint !== fingerprint) {
      throw new OrderError(409, 'This checkout request was already used. Start a new checkout.');
    }
    return existing.receipt;
  }

  try {
    return await client.withSession(session => session.withTransaction(async () => {
      const existing = await receiptForExisting(session);
      if (existing) return existing;
      const record = await settings.findOne({ _id: 'marketplace' }, { session });
      const { items, totalPaise, listings } = priceOrder(record?.config, input);
      const receipt = { reference, status: 'confirmed', payment: 'cod', delivery: input.delivery, items, totalPaise };
      await settings.updateOne({ _id: 'marketplace' }, {
        $set: { 'config.listings': listings }, $inc: { revision: 1 },
      }, { session });
      await orders.insertOne({
        _id: input.requestId, fingerprint, receipt, createdAt: new Date(),
        deliveryAddress: { locationId: input.locationId, name: input.name, phone: input.phone, address: input.address },
      }, { session });
      return receipt;
    }));
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await receiptForExisting();
    if (!existing) throw error;
    return existing;
  }
}
