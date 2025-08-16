'use client';

import ClientApp from '@/components/ClientApp';
import Providers from '@/components/providers/Providers';

export default function Home() {
  return (
    <Providers>
      <ClientApp />
    </Providers>
  );
}
