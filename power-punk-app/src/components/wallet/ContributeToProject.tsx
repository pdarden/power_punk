'use client';

import { useState, useCallback } from 'react';
import { useSendEvmTransaction, useEvmAddress } from '@coinbase/cdp-hooks';
// Using regular HTML elements instead of CDP components
import { formatUnits, parseUnits } from 'viem';

interface ContributeToProjectProps {
  projectId: string;
  projectWalletAddress: string;
  unitPrice: number;
  onSuccess?: (transactionHash: string) => void;
}

// USDC contract address on Base mainnet
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export default function ContributeToProject({
  projectId,
  projectWalletAddress,
  unitPrice,
  onSuccess,
}: ContributeToProjectProps) {
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { evmAddress } = useEvmAddress();

  const [units, setUnits] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const totalAmount = units * unitPrice;

  const handleContribute = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!evmAddress) return;

      e.preventDefault();
      setIsPending(true);

      try {
        // Convert amount to USDC wei (6 decimals)
        const amountInWei = parseUnits(totalAmount.toString(), 6);

        // USDC transfer transaction
        const { transactionHash } = await sendEvmTransaction({
          transaction: {
            to: USDC_CONTRACT_ADDRESS,
            data: `0xa9059cbb000000000000000000000000${projectWalletAddress.slice(2)}${amountInWei.toString(16).padStart(64, '0')}`,
            gas: 65000n,
            chainId: 8453, // Base mainnet
            type: 'eip1559',
          },
          evmAccount: evmAddress,
          network: 'base-mainnet',
        });

        setTransactionHash(transactionHash);
        onSuccess?.(transactionHash);
        
        // Here you would also call your API to update the project data
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: projectId,
            amount: totalAmount,
            units,
            fromWallet: evmAddress,
            transactionHash,
          }),
        });
        
      } catch (error) {
        console.error('Transaction failed:', error);
        alert('Transaction failed. Please try again.');
      } finally {
        setIsPending(false);
      }
    },
    [evmAddress, sendEvmTransaction, totalAmount, units, projectId, projectWalletAddress, onSuccess]
  );

  if (!evmAddress) {
    return <div className="w-full h-20 bg-gray-200 animate-pulse rounded" />;
  }

  if (transactionHash) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Contribution Successful! 🎉
        </h3>
        <p className="text-sm text-green-700 mb-2">
          You contributed {units} units for ${totalAmount} USDC
        </p>
        <p className="text-xs text-green-600 break-all">
          Transaction: {transactionHash}
        </p>
        <button 
          className="mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={() => {
            setTransactionHash(null);
            setUnits(1);
          }}
        >
          Contribute Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-900 rounded-lg bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribute to Project</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Number of Units
          </label>
          <input
            type="number"
            min="1"
            value={units}
            onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-900 rounded-lg bg-white text-gray-900"
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-900">Price per unit:</span>
            <span className="text-gray-900 font-medium">${unitPrice} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-900">Units:</span>
            <span className="text-gray-900 font-medium">{units}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">${totalAmount} USDC</span>
          </div>
        </div>

        <button
          onClick={handleContribute}
          disabled={isPending || units < 1}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isPending ? 'Processing...' : `Contribute ${totalAmount} USDC`}
        </button>

        <p className="text-xs text-gray-700 text-center">
          Transaction will be sent on Base network
        </p>
      </div>
    </div>
  );
}