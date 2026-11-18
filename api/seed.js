import { sampleProducts } from './catalogue.js';
import { client, database } from './database.js';

if (!client) throw new Error('Set MONGODB_URI before seeding.');

try {
  const products = database.collection('products');
  await products.createIndex({ id: 1 }, { unique: true });
  await products.bulkWrite(sampleProducts.map(product => ({
    updateOne: {
      filter: { id: product.id },
      update: { $setOnInsert: { ...product, active: true } },
      upsert: true,
    },
  })));
} finally {
  await client.close();
}
