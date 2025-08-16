'use client';

import { useEvmAddress } from '@coinbase/cdp-hooks';
import { AuthButton } from '@coinbase/cdp-react';
import { Wallet } from 'lucide-react';

export default function WalletHeader() {
  const { evmAddress } = useEvmAddress();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!evmAddress) {
    return <div className="w-32 h-10 bg-gray-200 animate-pulse rounded" />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        <Wallet className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-700 font-medium">
          {formatAddress(evmAddress)}
        </span>
      </div>
      
      <AuthButton />
    </div>
  );
}