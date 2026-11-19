import CataloguePage from './catalogue';

export const dynamic = 'force-dynamic';

export default function Page({ searchParams }) {
  return <CataloguePage searchParams={searchParams} />;
}
