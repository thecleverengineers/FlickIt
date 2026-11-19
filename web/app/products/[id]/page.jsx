import CataloguePage from '../../catalogue';

export default async function ProductPage({ params, searchParams }) {
  const { id } = await params;
  return <CataloguePage searchParams={searchParams} productId={id} />;
}
