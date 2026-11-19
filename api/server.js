import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { sampleProducts } from './catalogue.js';
import { client, database } from './database.js';
import { demoMarketplace, getCatalogue, validateMarketplace } from './marketplace.js';

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readConfig() {
  if (!database) return demoMarketplace;
  const record = await database.collection('settings').findOne({ _id: 'marketplace' });
  return record?.config ?? null;
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
  const admin = path === '/v1/admin/marketplace';
  if (!admin && !['/health', '/v1/products', '/v1/marketplace'].includes(path)) {
    return send(response, 404, { error: 'Not found' });
  }
  if (admin && !isAdmin(request)) return send(response, 401, { error: 'Unauthorized' });
  const methods = admin ? ['GET', 'PUT'] : ['GET'];
  if (!methods.includes(request.method)) {
    response.setHeader('Allow', methods.join(', '));
    return send(response, 405, { error: 'Method not allowed' });
  }
  try {
    if (path === '/health') {
      if (database) await database.command({ ping: 1 });
      return send(response, 200, { status: 'ok', mode: database ? 'mongodb' : 'demo' });
    }
    if (admin && request.method === 'PUT') {
      if (!database) return send(response, 503, { error: 'Configure MongoDB for admin writes' });
      let config;
      try {
        config = validateMarketplace(await readBody(request));
      } catch (error) {
        return send(response, 400, { error: error.message });
      }
      await database.collection('settings').updateOne(
        { _id: 'marketplace' }, { $set: { config } }, { upsert: true }
      );
      return send(response, 200, { config });
    }
    const config = await readConfig();
    if (admin) return send(response, 200, { config });
    if (path === '/v1/marketplace') return send(response, 200, {
      locations: config?.locations ?? [],
      paymentMethods: config?.paymentMethods ?? [],
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
    console.error('Marketplace request failed', error.name);
    return send(response, 503, { error: 'Marketplace temporarily unavailable' });
  }
}).listen(Number(process.env.PORT || 4000));
