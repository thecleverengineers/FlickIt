import MarketplaceAdmin from './marketplace-admin';
import './admin.css';

export const metadata = { title: 'Marketplace admin | Flickit', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <main className="admin">
    <a href="/">Back to storefront</a>
    <h1>Marketplace admin</h1>
    <MarketplaceAdmin />
  </main>;
}
