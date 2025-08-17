"use client";

import { useState, useCallback, useEffect } from "react";
import { useSendEvmTransaction, useEvmAddress } from "@coinbase/cdp-hooks";
import { TransactionReceipt } from "viem";
import {
  parseUSDCAmount,
  getNetworkConfig,
  getRegistryAddress,
  encodeUSDCApproval,
  encodeContribution,
  encodeProjectCreation,
  createEscrowDeploymentTransaction,
} from "@/contracts/coopEscrow";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

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
    timeline: Record<string, unknown>;
    milestones: Record<string, unknown>[];
    costCurve: Record<string, unknown>;
  };
  onSuccess?: (transactionHash: string, projectId: string) => void;
}

type DeploymentStep =
  | "deploy"
  | "approve"
  | "contribute"
  | "register"
  | "complete";

export default function CreateProjectSmartContract({
  projectData,
  onSuccess,
}: CreateProjectSmartContractProps) {
  const { sendEvmTransaction } = useSendEvmTransaction();
  const { evmAddress } = useEvmAddress();

  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<DeploymentStep>("deploy");
  const [deploymentHash, setDeploymentHash] = useState<string | null>(null);
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [contributionHash, setContributionHash] = useState<string | null>(null);
  const [registrationHash, setRegistrationHash] = useState<string | null>(null);
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);
  const [walrusId, setWalrusId] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock function to replace Walrus upload
  const uploadToWalrus = useCallback(async (): Promise<string> => {
    // Mock implementation - just return a fake ID
    return `mock_walrus_${Date.now()}`;
  }, []);

  const registerENS = useCallback(async (): Promise<string> => {
    // TODO: Implement ENS registration
    return `${projectData.projectTitle.toLowerCase().replace(/\s+/g, "-")}.eth`;
  }, [projectData.projectTitle]);

  // Receipt states for tracking deployment progress
  const [, setDeploymentReceipt] = useState<TransactionReceipt | null>(null);
  const [, setApprovalReceipt] = useState<TransactionReceipt | null>(null);
  const [, setContributionReceipt] = useState<TransactionReceipt | null>(null);
  const [, setRegistrationReceipt] = useState<TransactionReceipt | null>(null);

  // Helper function to wait for transaction receipt
  const waitForTransactionReceipt = useCallback(
    async (hash: string): Promise<TransactionReceipt | null> => {
      const networkConfig = getNetworkConfig();
      const publicClient = createPublicClient({
        chain: networkConfig.chainId === 8453 ? base : baseSepolia,
        transport: http(networkConfig.rpcUrl),
      });

      let receipt: TransactionReceipt | null = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5 second intervals

      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await publicClient.getTransactionReceipt({
            hash: hash as `0x${string}`,
          });
          if (receipt) break;
        } catch {
          // Transaction not yet mined, continue waiting
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      }

      return receipt;
    },
    [],
  );

  const projectCreationFee = projectData.initialUnitCost;
  const requiredContributions = Math.ceil(
    projectData.goalAmount / projectData.initialUnitCost,
  );

  const handleUSDCApproval = useCallback(
    async (contractAddress: string) => {
      if (!evmAddress) return;

      try {
        const networkConfig = getNetworkConfig();
        const approvalAmount = parseUSDCAmount(projectCreationFee);

        console.log("Approving USDC spending...", {
          spender: contractAddress,
          amount: approvalAmount.toString(),
        });

        const approvalTx = {
          to: networkConfig.usdcAddress as `0x${string}`,
          data: encodeUSDCApproval(
            contractAddress,
            approvalAmount,
          ) as `0x${string}`,
          gas: BigInt(65000),
          chainId: networkConfig.chainId,
          type: "eip1559" as const,
        };

        const { transactionHash } = await sendEvmTransaction({
          transaction: approvalTx,
          evmAccount: evmAddress,
          network: "base-sepolia",
        });

        setApprovalHash(transactionHash);
      } catch (error) {
        console.error("USDC approval failed:", error);
        setError("Failed to approve USDC spending. Please try again.");
        setIsPending(false);
      }
    },
    [evmAddress, projectCreationFee, sendEvmTransaction],
  );

  const handleCreatorContribution = useCallback(async () => {
    if (!evmAddress || !escrowAddress) return;

    try {
      const networkConfig = getNetworkConfig();
      const contributionAmount = parseUSDCAmount(projectCreationFee);

      console.log("Making creator contribution...", {
        escrowAddress,
        amount: contributionAmount.toString(),
      });

      const contributionTx = {
        to: escrowAddress as `0x${string}`,
        data: encodeContribution(contributionAmount) as `0x${string}`,
        gas: BigInt(150000),
        chainId: networkConfig.chainId,
        type: "eip1559" as const,
      };

      const { transactionHash } = await sendEvmTransaction({
        transaction: contributionTx,
        evmAccount: evmAddress,
        network: "base-sepolia",
      });

      setContributionHash(transactionHash);
    } catch (error) {
      console.error("Creator contribution failed:", error);
      setError("Failed to create contribution. Please try again.");
      setIsPending(false);
    }
  }, [evmAddress, escrowAddress, projectCreationFee, sendEvmTransaction]);

  const handleProjectRegistration = useCallback(async () => {
    if (!evmAddress || !escrowAddress || !ensName || !walrusId) return;

    try {
      const networkConfig = getNetworkConfig();
      const registryAddress = getRegistryAddress();
      const metaURI = `ipfs://walrus/${walrusId}`;

      console.log("Registering project in registry:", {
        ensName,
        escrowAddress,
        metaURI,
      });

      const registrationTx = {
        to: registryAddress as `0x${string}`,
        data: encodeProjectCreation(
          ensName,
          escrowAddress,
          metaURI,
        ) as `0x${string}`,
        gas: BigInt(200000),
        chainId: networkConfig.chainId,
        type: "eip1559" as const,
      };

      const { transactionHash } = await sendEvmTransaction({
        transaction: registrationTx,
        evmAccount: evmAddress,
        network: "base-sepolia",
      });

      setRegistrationHash(transactionHash);
    } catch (error) {
      console.error("Project registration failed:", error);
      setError("Failed to register project. Please try again.");
      setIsPending(false);
    }
  }, [evmAddress, escrowAddress, ensName, walrusId, sendEvmTransaction]);

  const saveProject = useCallback(async () => {
    if (
      !evmAddress ||
      !walrusId ||
      !ensName ||
      !escrowAddress ||
      !registrationHash
    )
      return;

    try {
      // Generate mock IDs (replacing Walrus upload)
      const walrusResult = await uploadToWalrus();
      const ensResult = await registerENS();
      setWalrusId(walrusResult);
      setEnsName(ensResult);

      const projectId = `project_${Date.now()}`;
      const registryAddress = getRegistryAddress();

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectData: {
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
            timeline: {
              startDate: new Date().toISOString(),
              endDate: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              milestones: [],
            },
            referrals: [],
            costCurve: {},
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
          transactionHash: registrationHash,
          contractAddress: escrowAddress,
          escrowType: "contract",
          walrusId,
          ensName,
          registryAddress,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const result = await response.json();
      onSuccess?.(registrationHash, result.campaign.id);
    } catch (error) {
      console.error("Project save failed:", error);
      setError(
        "Project deployed but failed to save to database. Please contact support.",
      );
    } finally {
      setIsPending(false);
    }
  }, [
    evmAddress,
    walrusId,
    ensName,
    escrowAddress,
    registrationHash,
    projectData,
    projectCreationFee,
    onSuccess,
    uploadToWalrus,
    registerENS,
  ]);

  // Handle deployment receipt
  useEffect(() => {
    if (deploymentHash && step === "deploy") {
      waitForTransactionReceipt(deploymentHash).then((receipt) => {
        if (receipt && receipt.contractAddress) {
          setDeploymentReceipt(receipt);
          const contractAddress = receipt.contractAddress;
          setEscrowAddress(contractAddress);
          console.log("Contract deployed at:", contractAddress);

          // Move to approval step
          setStep("approve");
          handleUSDCApproval(contractAddress);
        }
      });
    }
  }, [deploymentHash, step, waitForTransactionReceipt, handleUSDCApproval]);

  // Handle approval receipt
  useEffect(() => {
    if (approvalHash && step === "approve") {
      waitForTransactionReceipt(approvalHash).then((receipt) => {
        if (receipt) {
          setApprovalReceipt(receipt);
          console.log("USDC approval confirmed");

          // Move to contribution step
          setStep("contribute");
          handleCreatorContribution();
        }
      });
    }
  }, [
    approvalHash,
    step,
    waitForTransactionReceipt,
    handleCreatorContribution,
  ]);

  // Handle contribution receipt
  useEffect(() => {
    if (contributionHash && step === "contribute") {
      waitForTransactionReceipt(contributionHash).then((receipt) => {
        if (receipt) {
          setContributionReceipt(receipt);
          console.log("Creator contribution confirmed");

          // Move to registration step
          setStep("register");
          handleProjectRegistration();
        }
      });
    }
  }, [
    contributionHash,
    step,
    waitForTransactionReceipt,
    handleProjectRegistration,
  ]);

  // Handle registration receipt
  useEffect(() => {
    if (registrationHash && step === "register") {
      waitForTransactionReceipt(registrationHash).then((receipt) => {
        if (receipt) {
          setRegistrationReceipt(receipt);
          console.log("Project registration confirmed");

          // Move to complete step and save to database
          setStep("complete");
          saveProject();
        }
      });
    }
  }, [registrationHash, step, waitForTransactionReceipt, saveProject]);

  const createDeploymentTransaction = useCallback(() => {
    if (!evmAddress) throw new Error("No wallet address");

    const networkConfig = getNetworkConfig();

    // Use the fixed function from coopEscrow.ts
    return createEscrowDeploymentTransaction({
      token: networkConfig.usdcAddress,
      beneficiary: evmAddress,
      goal: parseUSDCAmount(projectData.goalAmount),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
      minContribution: parseUSDCAmount(projectData.initialUnitCost),
      creatorContribution: BigInt(0), // 0 in constructor, separate tx later
    });
  }, [evmAddress, projectData]);

  const handleCreateProject = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!evmAddress) return;

      e.preventDefault();
      setIsPending(true);
      setError(null);
      setStep("deploy");

      try {
        const registryAddress = getRegistryAddress();

        if (!registryAddress) {
          throw new Error("Project registry address not found");
        }

        // Generate mock Walrus ID (Walrus removed for now)
        console.log("Generating mock Walrus ID...");
        const walrusIdResult = `mock_walrus_${Date.now()}`;
        setWalrusId(walrusIdResult);

        // Create ENS name from project title
        const ensNameResult =
          projectData.projectTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") +
          ".eth";
        setEnsName(ensNameResult);

        console.log("Deploying escrow contract...");

        // Deploy escrow contract (step 1)
        const deploymentTx = createDeploymentTransaction();
        console.log("Deployment transaction:", {
          to: deploymentTx.to,
          data: deploymentTx.data?.slice(0, 100) + "...", // First 100 chars of data
          gas: deploymentTx.gas,
          chainId: deploymentTx.chainId,
          dataLength: deploymentTx.data?.length,
        });

        const networkConfig = getNetworkConfig();
        const networkName =
          networkConfig.chainId === 8453 ? "base-mainnet" : "base-sepolia";

        const { transactionHash: deployHash } = await sendEvmTransaction({
          transaction: deploymentTx,
          evmAccount: evmAddress,
          network: networkName,
        });

        setDeploymentHash(deployHash);
        console.log("Deployment transaction sent:", deployHash);

        // Subsequent steps will be handled by useEffect hooks
      } catch (error) {
        console.error("Smart contract project creation failed:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Smart contract project creation failed. Please try again.",
        );
        setIsPending(false);
      }
    },
    [
      evmAddress,
      sendEvmTransaction,
      projectData,
      projectCreationFee,
      createDeploymentTransaction,
    ],
  );

  if (!evmAddress) {
    return <div className="w-full h-20 bg-gray-200 animate-pulse rounded" />;
  }

  if (
    step === "complete" &&
    deploymentHash &&
    registrationHash &&
    escrowAddress
  ) {
    const registryAddress = getRegistryAddress();
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Smart Contract Project Created! 🎉
        </h3>
        <p className="text-sm text-green-700 mb-2">
          Your project &quot;{projectData.projectTitle}&quot; is now live with
          its own escrow contract
        </p>
        <div className="space-y-2 mb-4">
          <p className="text-sm text-green-700">
            <strong>Escrow Contract:</strong> {escrowAddress}
          </p>
          <p className="text-sm text-green-700">
            <strong>Registry Contract:</strong> {registryAddress}
          </p>
          <p className="text-sm text-green-700">
            <strong>Initial Contribution:</strong> ${projectCreationFee} USDC
          </p>
        </div>

        <div className="space-y-1 mb-4">
          <p className="text-xs text-green-600 break-all">
            <strong>Deployment:</strong> {deploymentHash}
          </p>
          {approvalHash && (
            <p className="text-xs text-green-600 break-all">
              <strong>USDC Approval:</strong> {approvalHash}
            </p>
          )}
          {contributionHash && (
            <p className="text-xs text-green-600 break-all">
              <strong>Contribution:</strong> {contributionHash}
            </p>
          )}
          <p className="text-xs text-green-600 break-all">
            <strong>Registration:</strong> {registrationHash}
          </p>
        </div>

        <div className="p-3 bg-green-100 rounded text-xs text-green-700">
          <strong>Smart Contract Features:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Dedicated escrow contract for this project</li>
            <li>Registered in on-chain project registry</li>
            <li>Trustless fund management and distribution</li>
            <li>Automatic refunds if goals aren&apos;t met</li>
            <li>Transparent contribution tracking</li>
          </ul>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsPending(false);
            setStep("deploy");
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const getStepStatus = (stepName: DeploymentStep) => {
    const stepOrder: DeploymentStep[] = [
      "deploy",
      "approve",
      "contribute",
      "register",
      "complete",
    ];
    const currentIndex = stepOrder.indexOf(step);
    const stepIndex = stepOrder.indexOf(stepName);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const getStepDescription = (stepName: DeploymentStep) => {
    switch (stepName) {
      case "deploy":
        return "Deploy Escrow Contract";
      case "approve":
        return "Approve USDC Spending";
      case "contribute":
        return "Make Initial Contribution";
      case "register":
        return "Register in Project Registry";
      case "complete":
        return "Complete";
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">
        Create Project with Smart Contract Escrow
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

        {isPending && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">
              Deployment Progress
            </h4>
            <div className="space-y-2">
              {(
                [
                  "deploy",
                  "approve",
                  "contribute",
                  "register",
                ] as DeploymentStep[]
              ).map((stepName) => {
                const status = getStepStatus(stepName);
                return (
                  <div key={stepName} className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded-full flex-shrink-0 ${
                        status === "completed"
                          ? "bg-green-500"
                          : status === "active"
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        status === "completed"
                          ? "text-green-700"
                          : status === "active"
                            ? "text-yellow-700"
                            : "text-gray-500"
                      }`}
                    >
                      {getStepDescription(stepName)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-1">
            Smart Contract Benefits
          </h4>
          <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
            <li>Individual escrow contract per project</li>
            <li>Registered in on-chain project registry</li>
            <li>Transparent contribution tracking</li>
            <li>Trustless fund management</li>
            <li>Automatic refunds if goals aren&apos;t met</li>
          </ul>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-1">
            Deployment Process
          </h4>
          <p className="text-sm text-yellow-700">
            This will deploy a new escrow contract specifically for your
            project, approve USDC spending, make your initial contribution of $
            {projectCreationFee} USDC, and register the project in our registry.
          </p>
        </div>

        <button
          onClick={handleCreateProject}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isPending
            ? `${getStepDescription(step)}...`
            : `Deploy Escrow & Create Project (${projectCreationFee} USDC)`}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Project will be deployed on Base Sepolia testnet
        </p>
      </div>
    </div>
  );
}
