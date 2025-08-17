'use client';

import { useState, useCallback } from 'react';
import { useSendEvmTransaction, useEvmAddress } from '@coinbase/cdp-hooks';
import { formatUnits, parseUnits } from 'viem';
import { 
  createContributionTransactions, 
  parseUSDCAmount, 
  getNetworkConfig
} from '@/contracts/coopEscrow';

interface ContributeToProjectProps {
  projectId: string;
  escrowAddress?: string; // CoopEscrow contract address (primary flow)
  projectWalletAddress?: string; // Agent wallet address (secondary flow)
  unitPrice: number;
  escrowType?: 'contract' | 'agent'; // Determines which flow to use
  onSuccess?: (transactionHash: string) => void;
}

export default function ContributeToProject({
  projectId,
  escrowAddress,
  projectWalletAddress,
  unitPrice,
  escrowType = 'contract', // Default to contract escrow
  onSuccess,
}: ContributeToProjectProps) {
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { evmAddress } = useEvmAddress();

  const [units, setUnits] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [contributionHash, setContributionHash] = useState<string | null>(null);
  const [step, setStep] = useState<'approve' | 'contribute' | 'complete'>('approve');

  const totalAmount = units * unitPrice;

  const handleContribute = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!evmAddress) return;

      e.preventDefault();
      setIsPending(true);

      try {
        const contributionAmount = parseUSDCAmount(totalAmount);
        
        if (escrowType === 'contract') {
          // Contract escrow flow - use CoopEscrow contract
          const targetEscrowAddress = escrowAddress; // Use project-specific escrow address
          
          if (!targetEscrowAddress) {
            throw new Error('Escrow contract address not found');
          }

          // Create approval and contribution transactions
          const { approvalTx, contributionTx } = createContributionTransactions({
            contractAddress: targetEscrowAddress,
            amount: contributionAmount,
            userAddress: evmAddress,
          });

          // Step 1: Approve USDC spending
          setStep('approve');
          const { transactionHash: approvalTxHash } = await sendEvmTransaction({
            transaction: approvalTx,
            evmAccount: evmAddress,
            network: 'base-sepolia' as any,
          });

          setApprovalHash(approvalTxHash);

          // Step 2: Make contribution to escrow
          setStep('contribute');
          const { transactionHash: contributionTxHash } = await sendEvmTransaction({
            transaction: contributionTx,
            evmAccount: evmAddress,
            network: 'base-sepolia' as any,
          });

          setContributionHash(contributionTxHash);
          setStep('complete');
          onSuccess?.(contributionTxHash);
          
        } else {
          // Agent wallet flow - direct USDC transfer
          if (!projectWalletAddress) {
            throw new Error('Project wallet address not found for agent flow');
          }

          const networkConfig = getNetworkConfig();
          
          // Create direct USDC transfer transaction
          const transferTx = {
            to: networkConfig.usdcAddress as `0x${string}`,
            data: `0xa9059cbb000000000000000000000000${projectWalletAddress.slice(2)}${contributionAmount.toString(16).padStart(64, '0')}` as `0x${string}`,
            gas: BigInt(65000),
            chainId: networkConfig.chainId,
            type: 'eip1559' as const,
          };

          const { transactionHash: transferTxHash } = await sendEvmTransaction({
            transaction: transferTx,
            evmAccount: evmAddress,
            network: 'base-sepolia' as any,
          });

          setContributionHash(transferTxHash);
          setStep('complete');
          onSuccess?.(transferTxHash);
        }
        
        // Update project data via API
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: projectId,
            amount: totalAmount,
            units,
            fromWallet: evmAddress,
            transactionHash: escrowType === 'contract' ? contributionHash : contributionHash,
            approvalHash: escrowType === 'contract' ? approvalHash : null,
            escrowAddress: escrowType === 'contract' ? escrowAddress : null,
            projectWalletAddress: escrowType === 'agent' ? projectWalletAddress : null,
            escrowType,
          }),
        });
        
      } catch (error) {
        console.error('Transaction failed:', error);
        alert('Transaction failed. Please try again.');
      } finally {
        setIsPending(false);
      }
    },
    [evmAddress, sendEvmTransaction, totalAmount, units, projectId, escrowAddress, projectWalletAddress, escrowType, onSuccess]
  );

  if (!evmAddress) {
    return <div className="w-full h-20 bg-gray-200 animate-pulse rounded" />;
  }

  if (step === 'complete' && contributionHash) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Contribution Successful! 🎉
        </h3>
        <p className="text-sm text-green-700 mb-2">
          You contributed {units} units for ${totalAmount} USDC
          {escrowType === 'contract' ? ' to the shared escrow' : ' to the project wallet'}
        </p>
        <div className="space-y-1">
          {approvalHash && (
            <p className="text-xs text-green-600 break-all">
              Approval Tx: {approvalHash}
            </p>
          )}
          <p className="text-xs text-green-600 break-all">
            {escrowType === 'contract' ? 'Contribution' : 'Transfer'} Tx: {contributionHash}
          </p>
        </div>
        <button 
          className="mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={() => {
            setStep('approve');
            setApprovalHash(null);
            setContributionHash(null);
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
          {isPending 
            ? (escrowType === 'contract' 
              ? (step === 'approve' ? 'Approving USDC...' : 'Contributing to Escrow...') 
              : 'Sending USDC...'
            )
            : `Contribute ${totalAmount} USDC`
          }
        </button>

        <p className="text-xs text-gray-700 text-center">
          {escrowType === 'contract' 
            ? 'Funds will be held in smart contract escrow' 
            : 'Funds will be sent directly to project wallet'
          }
        </p>
      </div>
    </div>
  );
}