import CataloguePage from '../catalogue';

export const metadata = { title: 'Categories | Flickit' };

export default function CategoriesPage({ searchParams }) {
  return <CataloguePage searchParams={searchParams} categoriesPage />;
}
