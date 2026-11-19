'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CatalogueStatus({ state }) {
  const router = useRouter();
  const [retried, setRetried] = useState(false);
  const [pending, startTransition] = useTransition();
  const unavailable = state === 'unavailable';

  useEffect(() => {
    if (!unavailable || retried) return;
    const timer = setTimeout(() => {
      setRetried(true);
      startTransition(() => router.refresh());
    }, 1500);
    return () => clearTimeout(timer);
  }, [unavailable, retried, router]);

  const waiting = !unavailable || pending;
  return <div className="catalogue-status">
    <p role="status">{waiting ? 'Loading groceries…' :
      retried ? 'Groceries are temporarily unavailable.' :
      'The catalogue is taking longer than expected. Retrying shortly…'}</p>
    {unavailable && <button disabled={pending} onClick={() => {
      setRetried(true);
      startTransition(() => router.refresh());
    }}>Try again</button>}
  </div>;
}
