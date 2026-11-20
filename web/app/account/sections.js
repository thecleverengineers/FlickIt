export function sectionSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replaceAll(' ', '-');
}

export const publicSections = ['Appearance', 'Need help?', 'Share Flickit', 'About us', 'Sell on Flickit', 'Beta programme'];
export const privateSections = [
  'Birthday', 'Your orders', 'Content preferences', 'Delivery area', 'Address book',
  'Your wishlist', 'Bookmarked recipes', 'GST details', 'E-gift cards', 'Your prescriptions',
  'Payment settings', 'Flickit Money', 'Claim gift card', 'Collected rewards',
  'Community impact', 'Donation receipts', 'Account privacy', 'Notification preferences',
];
