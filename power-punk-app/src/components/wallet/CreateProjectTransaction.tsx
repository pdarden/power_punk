"use client";

import { useState, useCallback } from "react";
import { useSendEvmTransaction, useEvmAddress } from "@coinbase/cdp-hooks";
// Using regular HTML elements instead of CDP components
import { parseUnits } from "viem";

interface CreateProjectTransactionProps {
  projectData: {
    projectTitle: string;
    description: string;
    initialUnitCost: number; // This is the contribution amount per user
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

// USDC contract address on Base mainnet
const USDC_CONTRACT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export default function CreateProjectTransaction({
  projectData,
  onSuccess,
}: CreateProjectTransactionProps) {
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { evmAddress } = useEvmAddress();

  const [isPending, setIsPending] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Project creation fee = contribution amount (project owner makes first contribution)
  const projectCreationFee = projectData.initialUnitCost;
  const requiredContributions = Math.ceil(
    projectData.goalAmount / projectData.initialUnitCost,
  );

  const handleCreateProject = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!evmAddress) return;

      e.preventDefault();
      setIsPending(true);

      try {
        // First, store project data in Walrus
        const { walrusClient } = await import("@/lib/walrus/client");

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
            },
          ],
          timeline: projectData.timeline,
          referrals: [],
          costCurve: projectData.costCurve,
        };

        const walrusId =
          await walrusClient.storeProjectData(projectDataForWalrus);

        // Create the project agent wallet and get its address
        const { createProjectAgent } = await import("@/lib/coinbase/agentkit");
        const projectId = `project_${Date.now()}`;
        const { walletAddress } = await createProjectAgent(projectId);

        // Convert contribution amount to USDC wei (6 decimals)
        const contributionInWei = parseUnits(projectCreationFee.toString(), 6);

        // Send USDC contribution to project wallet (project owner's first contribution)
        // Following CDP docs pattern for ERC20 transfer
        const { transactionHash } = await sendEvmTransaction({
          transaction: {
            to: USDC_CONTRACT_ADDRESS,
            data: `0xa9059cbb000000000000000000000000${walletAddress.slice(2)}${contributionInWei.toString(16).padStart(64, "0")}` as `0x${string}`,
            gas: BigInt(65000),
            chainId: 84532, // Base Sepolia testnet (following docs)
            type: "eip1559",
          },
          evmAccount: evmAddress,
          network: "base-sepolia",
        });

        setTransactionHash(transactionHash);

        // Create the project via API
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectData: {
              ...projectData,
              contributors: [
                {
                  walletAddress: evmAddress,
                  units: 1,
                  totalAmountPaid: projectCreationFee,
                  timestamp: new Date().toISOString(),
                },
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
            projectWalletAddress: walletAddress,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create project");
        }

        const result = await response.json();
        onSuccess?.(transactionHash, result.campaign.id);
      } catch (error) {
        console.error("Project creation failed:", error);
        alert("Project creation failed. Please try again.");
      } finally {
        setIsPending(false);
      }
    },
    [
      evmAddress,
      sendEvmTransaction,
      projectData,
      projectCreationFee,
      onSuccess,
    ],
  );

  if (!evmAddress) {
    return <div className="w-full h-20 bg-gray-200 animate-pulse rounded" />;
  }

  if (transactionHash) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Project Created Successfully! 🎉
        </h3>
        <p className="text-sm text-green-700 mb-2">
          Your project &quot;{projectData.projectTitle}&quot; is now live
        </p>
        <p className="text-sm text-green-700 mb-2">
          You made the first contribution of ${projectCreationFee} USDC
        </p>
        <p className="text-xs text-green-600 break-all">
          Transaction: {transactionHash}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        Create Project & Make First Contribution
      </h3>

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
            <span className="font-medium">
              ${projectCreationFee} USDC per person
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Contributors Needed:</span>
            <span className="font-medium">{requiredContributions} people</span>
          </div>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-1">
            Your First Contribution
          </h4>
          <p className="text-sm text-yellow-700">
            As the project creator, you&apos;ll pay ${projectCreationFee} USDC
            to make the first contribution and activate your project. Other
            users will pay the same amount to contribute.
          </p>
        </div>

        <button
          onClick={handleCreateProject}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isPending
            ? "Creating Project..."
            : `Create Project & Pay ${projectCreationFee} USDC`}
        </button>

        <p className="text-xs text-gray-500 text-center">
          USDC transaction will be sent on Base network
        </p>
      </div>
    </div>
  );
}
