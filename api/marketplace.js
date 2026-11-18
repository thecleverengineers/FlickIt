import { sampleProducts } from './catalogue.js';

export const demoMarketplace = {
  locations: [
    { id: 'dimapur-centre', city: 'Dimapur', town: 'Dimapur', name: 'Central Dimapur' },
    { id: 'chumoukedima-centre', city: 'Chümoukedima', town: 'Chümoukedima', name: 'Central Chümoukedima' },
  ],
  sellers: [
    { id: 'fresh', name: 'Fresh Basket' },
    { id: 'pantry', name: 'Pantry House' },
  ],
  warehouses: [
    { id: 'fresh-dimapur', sellerId: 'fresh', locationIds: ['dimapur-centre'], instantMinutes: 45, shipping: true },
    { id: 'pantry-chumu', sellerId: 'pantry', locationIds: ['chumoukedima-centre'], instantMinutes: 90, shipping: true },
  ],
  listings: sampleProducts.map((product, index) => ({
    ...product,
    brand: index < 2 ? 'Fresh Basket' : 'Pantry House',
    variety: product.pack,
    warehouseId: index < 2 ? 'fresh-dimapur' : 'pantry-chumu',
    stock: 20,
  })),
  paymentMethods: ['cod', 'online'],
};

const isText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 120;

export function validateMarketplace(value) {
  function records(key, fields) {
    const rows = value?.[key];
    if (!Array.isArray(rows) || rows.length > 5000 ||
        !rows.every(row => row && fields.every(field => isText(row[field]))) ||
        new Set(rows.map(row => row.id)).size !== rows.length) {
      throw new Error(`Invalid or duplicate records in ${key}`);
    }
    return new Set(rows.map(row => row.id));
  }

  const locations = records('locations', ['id', 'city', 'town', 'name']);
  const sellers = records('sellers', ['id', 'name']);
  const warehouses = records('warehouses', ['id', 'sellerId']);
  records('listings', ['id', 'name', 'category', 'brand', 'variety', 'pack', 'warehouseId']);
  if (!value.warehouses.every(warehouse =>
    sellers.has(warehouse.sellerId) &&
    Array.isArray(warehouse.locationIds) && warehouse.locationIds.every(id => locations.has(id)) &&
    (warehouse.instantMinutes === null || (
      Number.isInteger(warehouse.instantMinutes) &&
      warehouse.instantMinutes >= 30 && warehouse.instantMinutes <= 120
    )) && typeof warehouse.shipping === 'boolean'
  )) throw new Error('Invalid warehouse coverage or delivery timing');
  if (!value.listings.every(listing => warehouses.has(listing.warehouseId) &&
      Number.isSafeInteger(listing.stock) && listing.stock >= 0 &&
      Number.isSafeInteger(listing.pricePaise) && listing.pricePaise >= 0
  )) throw new Error('Invalid listing warehouse, price or stock');
  if (!Array.isArray(value.paymentMethods) ||
      !value.paymentMethods.every(method => ['cod', 'online'].includes(method))) {
    throw new Error('Invalid payment methods');
  }
  return Object.fromEntries(['locations', 'sellers', 'warehouses', 'listings', 'paymentMethods']
    .map(key => [key, value[key]]));
}

export function getCatalogue(marketplace, locationId) {
  const warehouses = new Map(marketplace.warehouses.map(warehouse => [warehouse.id, warehouse]));
  const sellers = new Map(marketplace.sellers.map(seller => [seller.id, seller.name]));
  return marketplace.listings.filter(listing => listing.stock > 0).flatMap(listing => {
    const warehouse = warehouses.get(listing.warehouseId);
    const instantMinutes = warehouse.locationIds.includes(locationId) ? warehouse.instantMinutes : null;
    if (locationId && instantMinutes === null && !warehouse.shipping) return [];
    const { id, name, category, pack, pricePaise, brand, variety } = listing;
    return [{
      id, name, category, pack, pricePaise, brand, variety,
      seller: sellers.get(warehouse.sellerId),
      instantMinutes,
      shipping: warehouse.shipping,
    }];
  });
}
