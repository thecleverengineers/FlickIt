// Reference products only. Live sellers set prices and stock through Marketplace Admin.
const groups = [
  ['Vegetables & Fruits', [
    ['onion', 'Red onions', '1 kg'], ['tomato', 'Tomatoes', '500 g'],
    ['potato', 'Potatoes', '1 kg'], ['banana', 'Bananas', '6 pcs'],
  ]],
  ['Dairy & Bread', [
    ['milk', 'Toned milk', '500 ml'], ['curd', 'Plain curd', '400 g'],
    ['paneer', 'Paneer', '200 g'], ['bread', 'Whole wheat bread', '400 g'],
  ]],
  ['Rice, Atta & Dal', [
    ['rice', 'Rice', '1 kg'], ['atta', 'Whole wheat atta', '1 kg'],
    ['dal', 'Masoor dal', '500 g'], ['chana', 'Kabuli chana', '500 g'],
  ]],
  ['Oil, Ghee & Masala', [
    ['mustard-oil', 'Mustard oil', '1 L'], ['ghee', 'Cow ghee', '500 ml'],
    ['turmeric', 'Turmeric powder', '100 g'], ['cumin', 'Cumin seeds', '100 g'],
  ]],
  ['Chips & Namkeen', [
    ['salted-chips', 'Salted potato chips', '50 g'], ['bhujia', 'Aloo bhujia', '200 g'],
    ['roasted-peanuts', 'Roasted peanuts', '150 g'], ['banana-chips', 'Banana chips', '150 g'],
  ]],
  ['Bakery & Biscuits', [
    ['digestives', 'Digestive biscuits', '200 g'], ['butter-cookies', 'Butter cookies', '150 g'],
    ['rusks', 'Tea rusks', '200 g'], ['chocolate-wafers', 'Chocolate wafers', '100 g'],
  ]],
  ['Drinks & Juices', [
    ['orange-juice', 'Orange juice', '1 L'], ['coconut-water', 'Tender coconut water', '200 ml'],
    ['sparkling-water', 'Sparkling water', '500 ml'], ['soda', 'Club soda', '750 ml'],
  ]],
  ['Tea, Coffee & Breakfast', [
    ['black-tea', 'Assam black tea', '250 g'], ['coffee', 'Instant coffee', '100 g'],
    ['oats', 'Rolled oats', '500 g'], ['cornflakes', 'Corn flakes', '250 g'],
  ]],
  ['Instant & Frozen', [
    ['noodles', 'Instant noodles', '70 g'], ['pasta', 'Penne pasta', '500 g'],
    ['frozen-peas', 'Frozen green peas', '500 g'], ['frozen-corn', 'Frozen sweet corn', '500 g'],
  ]],
  ['Household & Cleaning', [
    ['dishwash', 'Dishwashing liquid', '500 ml'], ['laundry', 'Laundry detergent', '1 kg'],
    ['floor-cleaner', 'Floor cleaner', '500 ml'], ['tissues', 'Facial tissues', '100 pulls'],
  ]],
  ['Personal Care', [
    ['soap', 'Bath soap', '100 g'], ['toothpaste', 'Toothpaste', '150 g'],
    ['shampoo', 'Shampoo', '180 ml'], ['handwash', 'Liquid handwash', '250 ml'],
  ]],
  ['Nagaland Pantry', [
    ['bamboo-shoot', 'Fermented bamboo shoot', '200 g'], ['axone', 'Axone', '100 g'],
    ['king-chilli', 'Dried Naga king chilli', '25 g'], ['sticky-rice', 'Sticky rice', '1 kg'],
  ]],
];

export const starterProducts = groups.flatMap(([category, items]) =>
  items.map(([id, name, pack]) => ({ id, name, pack, category, active: true, preview: true })));

export async function importStarterCatalogue(database) {
  const products = database.collection('products');
  await products.bulkWrite(starterProducts.map(product => ({
    updateOne: {
      filter: { id: product.id },
      update: { $setOnInsert: product },
      upsert: true,
    },
  })), { ordered: false });
}
