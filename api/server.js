import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { OrderError, parseOrder, placeOrder } from './orders.js';
import { sampleProducts } from './catalogue.js';
import { client, database } from './database.js';
import { demoMarketplace, getCatalogue, validateMarketplace } from './marketplace.js';

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readMarketplace() {
  if (!database) return { config: demoMarketplace, revision: 0 };
  const record = await database.collection('settings').findOne({ _id: 'marketplace' });
  return { config: record?.config ?? null, revision: record?.revision ?? 0 };
}

function isAdmin(request) {
  const token = process.env.MARKETPLACE_ADMIN_TOKEN;
  if (!token || token.length < 32) return false;
  const digest = text => createHash('sha256').update(text).digest();
  return timingSafeEqual(digest(request.headers.authorization ?? ''), digest(`Bearer ${token}`));
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error('Configuration exceeds 1 MiB');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

if (process.env.FLICKIT_REQUIRE_DATABASE === 'true') {
  if (!database) {
    console.error('MONGODB_URI is required when FLICKIT_REQUIRE_DATABASE is enabled.');
    process.exit(1);
  }
  try {
    await database.command({ ping: 1 });
  } catch (error) {
    console.error('Flickit cannot reach MongoDB at startup.', error.name);
    await client.close();
    process.exit(1);
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  const adminOrders = path === '/v1/admin/orders';
  const admin = path === '/v1/admin/marketplace' || adminOrders;
  const order = path === '/v1/orders';
  if (!admin && !order && !['/health', '/v1/products', '/v1/marketplace'].includes(path)) {
    return send(response, 404, { error: 'Not found' });
  }
  if (admin && !isAdmin(request)) return send(response, 401, { error: 'Unauthorized' });
  const methods = adminOrders ? ['GET', 'PATCH'] : admin ? ['GET', 'PUT'] : order ? ['POST'] : ['GET'];
  if (!methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '));
    return send(response, 405, { error: 'Method not allowed' });
  }
  try {
    if (path === '/health') {
      if (database) await database.command({ ping: 1 });
      return send(response, 200, { status: 'ok', mode: database ? 'mongodb' : 'demo' });
    }
    if (adminOrders) {
      if (!database) return send(response, 503, { error: 'Orders require a MongoDB connection' });
      const orders = database.collection('orders');
      if (request.method === 'GET') {
        const recent = await orders.find({}, { projection: { _id: 0, receipt: 1, deliveryAddress: 1, createdAt: 1 } })
          .sort({ createdAt: -1 }).limit(100).toArray();
        return send(response, 200, { orders: recent });
      }
      let body;
      try { body = await readBody(request); } catch {
        return send(response, 400, { error: 'Invalid order update' });
      }
      const transitions = new Map([
        ['confirmed', 'packing'], ['packing', 'dispatched'], ['dispatched', 'delivered'],
      ]);
      if (typeof body?.reference !== 'string' || !transitions.has(body.status)) {
        return send(response, 400, { error: 'Invalid order reference or status' });
      }
      const result = await orders.updateOne({
        'receipt.reference': body.reference, 'receipt.status': body.status,
      }, { $set: { 'receipt.status': transitions.get(body.status), updatedAt: new Date() } });
      if (!result.matchedCount) return send(response, 409, { error: 'Order changed. Reload orders before updating.' });
      return send(response, 200, { status: transitions.get(body.status) });
    }
    if (order) {
      if (!database) return send(response, 503, { error: 'Checkout is unavailable in demo mode' });
      let body;
      try {
        body = await readBody(request);
      } catch {
        return send(response, 400, { error: 'Invalid checkout request' });
      }
      return send(response, 201, { order: await placeOrder(client, database, parseOrder(body)) });
    }
    if (admin && request.method === 'PUT') {
      if (!database) return send(response, 503, { error: 'Configure MongoDB for admin writes' });
      let config, revision;
      try {
        const body = await readBody(request);
        config = validateMarketplace(body);
        revision = body.revision;
        if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('A configuration revision is required');
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
      const settings = database.collection('settings');
      const filter = revision === 0
        ? { _id: 'marketplace', $or: [{ revision: 0 }, { revision: { $exists: false } }] }
        : { _id: 'marketplace', revision };
      try {
        const result = await settings.updateOne(filter, { $set: { config }, $inc: { revision: 1 } },
          { upsert: revision === 0 });
        if (!result.matchedCount && !result.upsertedCount) {
          return send(response, 409, { error: 'Marketplace settings changed. Reload before saving.' });
        }
      } catch (error) {
        if (error.code !== 11000) throw error;
        return send(response, 409, { error: 'Marketplace settings changed. Reload before saving.' });
      }
      return send(response, 200, { config, revision: revision + 1, writable: true });
    }
    const { config, revision } = await readMarketplace();
    if (admin) return send(response, 200, { config, revision, writable: Boolean(database) });
    if (path === '/v1/marketplace') return send(response, 200, {
      locations: config?.locations ?? [],
      paymentMethods: config?.paymentMethods ?? [],
      checkoutAvailable: Boolean(database && config?.paymentMethods.includes('cod')),
    });
    const locationId = url.searchParams.get('location');
    if (locationId && !config?.locations.some(location => location.id === locationId)) {
      return send(response, 400, { error: 'Unknown delivery location' });
    }
    if (config) return send(response, 200, { products: getCatalogue(config, locationId) });
    const projection = Object.fromEntries(
      ['id', 'name', 'category', 'pack', 'pricePaise'].map(field => [field, 1])
    );
    const products = database
      ? await database.collection('products').find({ active: true }, { projection: { ...projection, _id: 0 } })
        .sort({ name: 1, id: 1 }).limit(200).toArray()
      : sampleProducts;
    return send(response, 200, { products });
  } catch (error) {
    if (error instanceof OrderError) return send(response, error.status, { error: error.message });
    console.error('Marketplace request failed', error.name);
    return send(response, 503, { error: 'Marketplace temporarily unavailable' });
  }
}).listen(Number(process.env.PORT || 4000));
