'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSendEvmTransaction, useEvmAddress } from '@coinbase/cdp-hooks';
import { useWaitForTransactionReceipt } from 'wagmi';
import { 
  createEscrowDeploymentTransaction,
  createProjectRegistrationTransaction, 
  parseUSDCAmount, 
  getNetworkConfig,
  getRegistryAddress
} from '@/contracts/coopEscrow';
import { CoopEscrowDeployParams } from '@/contracts/types';

interface CreateProjectSmartContractProps {
  projectData: {
    projectTitle: string;
    description: string;
    initialUnitCost: number;
    goalAmount: number;
    location: {
      country: string;
      region: string;
      lat: string;
      lng: string;
    };
    projectType: string;
    timeline: any;
    milestones: any[];
    costCurve: any;
  };
  onSuccess?: (transactionHash: string, projectId: string) => void;
}

export default function CreateProjectSmartContract({
  projectData,
  onSuccess,
}: CreateProjectSmartContractProps) {
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { evmAddress } = useEvmAddress();

  const [isPending, setIsPending] = useState(false);
  const [deploymentHash, setDeploymentHash] = useState<string | null>(null);
  const [registrationHash, setRegistrationHash] = useState<string | null>(null);
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);
  const [step, setStep] = useState<'deploy' | 'register' | 'complete'>('deploy');
  const [isWaitingForReceipt, setIsWaitingForReceipt] = useState(false);
  const [walrusId, setWalrusId] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  
  const { data: deploymentReceipt } = useWaitForTransactionReceipt({
    hash: deploymentHash as `0x${string}`,
    query: {
      enabled: !!deploymentHash && isWaitingForReceipt,
    },
  });

  const projectCreationFee = projectData.initialUnitCost;
  const requiredContributions = Math.ceil(projectData.goalAmount / projectData.initialUnitCost);

  // Handle deployment receipt and continue with registration
  useEffect(() => {
    if (deploymentReceipt && deploymentReceipt.contractAddress && isWaitingForReceipt) {
      const contractAddress = deploymentReceipt.contractAddress;
      setEscrowAddress(contractAddress);
      setIsWaitingForReceipt(false);
      setStep('register');
      
      // Continue with registration
      registerProject(contractAddress);
    }
  }, [deploymentReceipt, isWaitingForReceipt]);

  const registerProject = async (contractAddress: string) => {
    if (!evmAddress || !ensName || !walrusId) return;
    
    try {
      const registryAddress = getRegistryAddress();
      const metaURI = `ipfs://walrus/${walrusId}`;
      
      console.log('Registering project in registry:', {
        ensName,
        escrowAddress: contractAddress,
        metaURI,
      });

      const registrationTx = createProjectRegistrationTransaction(
        ensName,
        contractAddress,
        metaURI
      );

      const { transactionHash: regHash } = await sendEvmTransaction({
        transaction: registrationTx,
        evmAccount: evmAddress,
        network: 'base-sepolia' as any,
      });

      setRegistrationHash(regHash);
      setStep('complete');

      // Create the project via API
      await saveProject(contractAddress, regHash, registryAddress);
      
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Project registration failed. Please try again.');
      setIsPending(false);
    }
  };

  const saveProject = async (contractAddress: string, transactionHash: string, registryAddress: string) => {
    if (!evmAddress || !walrusId || !ensName) return;

    try {
      const newProjectId = `project_${Date.now()}`;
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData: {
            ...projectData,
            contributors: [
              {
                walletAddress: evmAddress,
                units: 1,
                totalAmountPaid: projectCreationFee,
                timestamp: new Date().toISOString(),
              }
            ],
          },
          userId: evmAddress,
          location: {
            country: projectData.location.country,
            region: projectData.location.region,
            coordinates: {
              lat: parseFloat(projectData.location.lat),
              lng: parseFloat(projectData.location.lng),
            },
          },
          projectType: projectData.projectType,
          transactionHash,
          contractAddress,
          escrowType: 'contract',
          walrusId,
          ensName,
          registryAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const result = await response.json();
      onSuccess?.(transactionHash, result.campaign.id);
      
    } catch (error) {
      console.error('Project save failed:', error);
      alert('Project saved to blockchain but failed to save to database. Please contact support.');
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateProject = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!evmAddress) return;

      e.preventDefault();
      setIsPending(true);

      try {
        const networkConfig = getNetworkConfig();
        const registryAddress = getRegistryAddress();
        
        if (!registryAddress) {
          throw new Error('Project registry address not found');
        }

        // First, store project data in Walrus
        const { walrusClient } = await import('@/lib/walrus/client');
        
        const projectDataForWalrus = {
          projectTitle: projectData.projectTitle,
          description: projectData.description,
          initialUnitCost: projectData.initialUnitCost,
          goalAmount: projectData.goalAmount,
          contributors: [
            {
              walletAddress: evmAddress,
              units: 1,
              totalAmountPaid: projectCreationFee,
              timestamp: new Date().toISOString(),
            }
          ],
          timeline: projectData.timeline,
          referrals: [],
          costCurve: projectData.costCurve,
        };

        const walrusIdResult = await walrusClient.storeProjectData(projectDataForWalrus);
        setWalrusId(walrusIdResult);

        // Create ENS name from project title
        const ensNameResult = projectData.projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.eth';
        setEnsName(ensNameResult);

        // Step 1: Deploy individual escrow contract
        const deployParams: CoopEscrowDeployParams = {
          token: networkConfig.usdcAddress,
          beneficiary: evmAddress, // Project creator is the beneficiary
          goal: parseUSDCAmount(projectData.goalAmount),
          deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
          minContribution: parseUSDCAmount(projectData.initialUnitCost),
          creatorContribution: parseUSDCAmount(projectCreationFee), // Initial contribution from creator
        };

        const deploymentTx = createEscrowDeploymentTransaction(deployParams);

        console.log('Deploying individual escrow contract:', deployParams);

        const { transactionHash: deployHash } = await sendEvmTransaction({
          transaction: deploymentTx,
          evmAccount: evmAddress,
          network: 'base-sepolia' as any,
        });

        setDeploymentHash(deployHash);
        setIsWaitingForReceipt(true);
        
        // The deployment receipt handling will be done in the useEffect above

      } catch (error) {
        console.error('Smart contract project creation failed:', error);
        alert('Smart contract project creation failed. Please try again.');
      } finally {
        setIsPending(false);
      }
    },
    [evmAddress, sendEvmTransaction, projectData, projectCreationFee, onSuccess]
  );

  if (!evmAddress) {
    return <div className="w-full h-20 bg-gray-200 animate-pulse rounded" />;
  }

  if (step === 'complete' && deploymentHash && registrationHash && escrowAddress) {
    const registryAddress = getRegistryAddress();
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Smart Contract Project Created! 🎉
        </h3>
        <p className="text-sm text-green-700 mb-2">
          Your project &quot;{projectData.projectTitle}&quot; is now registered with its own escrow contract
        </p>
        <p className="text-sm text-green-700 mb-2">
          Escrow Contract: {escrowAddress}
        </p>
        <p className="text-sm text-green-700 mb-2">
          Registry Contract: {registryAddress}
        </p>
        <p className="text-sm text-green-700 mb-2">
          Initial contribution: ${projectCreationFee} USDC (included in deployment)
        </p>
        <div className="space-y-1">
          <p className="text-xs text-green-600 break-all">
            Deployment Tx: {deploymentHash}
          </p>
          <p className="text-xs text-green-600 break-all">
            Registration Tx: {registrationHash}
          </p>
        </div>
        <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-700">
          <strong>Smart Contract Features:</strong>
          <ul className="list-disc list-inside mt-1">
            <li>Individual escrow contract per project</li>
            <li>Registry tracking for all projects</li>
            <li>Trustless fund distribution</li>
            <li>Transparent contribution tracking</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Create Project with Smart Contract Escrow</h3>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between text-sm mb-1">
            <span>Project:</span>
            <span className="font-medium">{projectData.projectTitle}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Funding Goal:</span>
            <span className="font-medium">${projectData.goalAmount} USDC</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span>Contribution Amount:</span>
            <span className="font-medium">${projectCreationFee} USDC per person</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Contributors Needed:</span>
            <span className="font-medium">{requiredContributions} people</span>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-1">Smart Contract Benefits</h4>
          <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
            <li>Individual escrow contract per project</li>
            <li>Registered in on-chain project registry</li>
            <li>Transparent contribution tracking</li>
            <li>Trustless fund management</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-1">Project Creation Process</h4>
          <p className="text-sm text-yellow-700">
            A new escrow contract will be deployed specifically for your project with your initial contribution 
            of ${projectCreationFee} USDC, then registered in our project registry.
          </p>
        </div>

        <button
          onClick={handleCreateProject}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isPending 
            ? (step === 'deploy' ? 'Deploying Escrow Contract...' : step === 'register' ? 'Registering Project...' : 'Creating Project...') 
            : `Deploy Escrow & Create Project (${projectCreationFee} USDC)`
          }
        </button>

        <p className="text-xs text-gray-500 text-center">
          Project will be registered on Base Sepolia testnet
        </p>
      </div>
    </div>
  );
}