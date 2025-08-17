'use client';

import { CDPReactProvider, type AppConfig } from '@coinbase/cdp-react';
import { type Config } from '@coinbase/cdp-core';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// CDP Configuration
const config: Config = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID ?? '',
};

// App Configuration
const appConfig: AppConfig = {
  name: 'PowerPunk',
  logoUrl: '/powerpunk.png',
  authMethods: ["email"] as const,
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <CDPReactProvider config={config} app={appConfig}>
      {children}
    </CDPReactProvider>
  );
}