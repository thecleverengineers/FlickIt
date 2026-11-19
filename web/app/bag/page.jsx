import CataloguePage from '../catalogue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your bag | Flickit' };

export default function BagPage({ searchParams }) {
  return <CataloguePage searchParams={searchParams} bagPage />;
}
