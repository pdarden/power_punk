'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletService, setWalletService] = useState<any>(null);

  useEffect(() => {
    // Dynamically import wallet service to avoid SSR issues
    const initializeWallet = async () => {
      try {
        const { walletService: ws } = await import('@/lib/coinbase/wallets');
        setWalletService(ws);
        
        // Check if wallet is already connected
        try {
          const provider = ws['sdk'].makeWeb3Provider();
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts && Array.isArray(accounts) && accounts.length > 0) {
            setAddress(accounts[0]);
          }
        } catch (error) {
          console.log('Could not check existing connection');
        }
      } catch (error) {
        console.log('Wallet service not available, using demo mode');
        // Gracefully handle missing dependencies
      }
    };
    
    initializeWallet();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (walletService) {
        // Use real Coinbase Wallet
        await walletService.switchToBase();
        const { address } = await walletService.connect();
        setAddress(address);
      } else {
        // Demo mode - simulate wallet connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockAddress = '0x' + Math.random().toString(16).substring(2, 42);
        setAddress(mockAddress);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Wallet connection failed. Please try again!');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (walletService) {
        await walletService.disconnect();
      }
      setAddress(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      setAddress(null); // Force disconnect anyway
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {formatAddress(address)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}