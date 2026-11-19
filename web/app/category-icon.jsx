const artwork = {
  All: ['#f9eadf', '#993f2d', <><path d="M13 21h22l-2 16H15l-2-16Z" fill="#e9a17b"/><path d="m18 23 6-12 6 12M18 28v4m6-4v4m6-4v4"/></>],
  'Dairy & Bread': ['#fff0d8', '#844a33', <><path d="M12 19h13v18H12zM12 19l4-7h7l2 7" fill="#fffdf9"/><path d="M12 25h13v6H12z" fill="#80b9d3"/><path d="M27 36V27c-2-2-2-6 1-8s8-2 10 1 1 5-1 7v9z" fill="#eab262"/></>],
  'Rice & Grains': ['#edf1de', '#57683b', <><path d="M11 26h26a13 13 0 0 1-26 0Z" fill="#9eba75"/><path d="M13 26c2-4 5-6 10-6s9 2 12 6" fill="#fff9e9"/><path d="M24 20v-9m0 5-5-3m5 2 5-3"/></>],
  'Biscuits & Bakery': ['#f9e7dd', '#83482e', <><circle cx="24" cy="24" r="13" fill="#e9aa63"/><path d="m18 19 1 1m9-4 1 1m2 10 1 1m-13 1 1 1m4-7 1 1"/></>],
  'Cooking Essentials': ['#fbece4', '#913f2e', <><path d="M14 22h20v7a7 7 0 0 1-7 7h-6a7 7 0 0 1-7-7v-7Z" fill="#e58a70"/><path d="M11 22h26m-17-4h8m-4 0v-4m-10 12h-4m24 0h4"/></>],
  'Drinks & Juices': ['#ffeed7', '#91532c', <><path d="M15 19h17l-2 17H18l-3-17Z" fill="#f8b95d"/><path d="m25 19 3-8h6M17 25h14"/><circle cx="33" cy="21" r="5" fill="#f7d28a"/></>],
  'Personal Care': ['#f3eafa', '#704785', <><path d="M16 23a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v13H16V23Z" fill="#caa7dd"/><path d="M24 19v-6h8m-12 13h8v5h-8z" fill="#fff8ff"/><path d="M36 15v6m-3-3h6"/></>],
  'Tea & Coffee': ['#f1e9e1', '#704635', <><path d="M12 23h20v5a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8v-5Z" fill="#dcb093"/><path d="M32 24h3a4 4 0 0 1-4 7M10 37h28M19 19c-3-3 3-4 0-7m8 7c-3-3 3-4 0-7"/></>],
  'Instant Foods': ['#fbe9e7', '#924638', <><path d="M11 25h26c-1 7-5 11-13 11s-12-4-13-11Z" fill="#eaa090"/><path d="M16 25c0-5 5-6 7-3 2-4 7-4 10 3m-9-8 8-8m-3 9 8-8"/></>],
  'Chips & Snacks': ['#fff0d9', '#875128', <><path d="M16 12h16l-1 5 3 15-2 5H16l-2-5 3-15-1-5Z" fill="#f2bb56"/><path d="M17 17h14m-16 15h18"/><path d="M20 27c0-5 5-6 8-4 3 4-3 7-8 4Z" fill="#fff3ca"/></>],
  Produce: ['#ecf2df', '#556d38', <><path d="M13 32c0-10 8-17 22-17-1 13-8 21-20 20Z" fill="#9fbd76"/><path d="m13 36 15-14"/></>],
};

const demoCategories = { Dairy: 'Dairy & Bread', Pantry: 'Cooking Essentials' };

export default function CategoryIcon({ name }) {
  const [background, stroke, shape] = artwork[name] ?? artwork[demoCategories[name]] ?? artwork.All;
  return <span className="quick-category-icon" style={{ background }}>
    <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true" fill="none"
      stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shape}</svg>
  </span>;
}
