import AccountSection from '../../[section]/page';

export default async function OrderDetailsPage({ params, searchParams }) {
  const { reference } = await params;
  return AccountSection({ params: { section: 'your-orders', reference }, searchParams });
}
