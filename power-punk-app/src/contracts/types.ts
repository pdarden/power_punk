// Contract addresses and configuration
export const CONTRACT_ADDRESSES = {
  // USDC on Base mainnet
  USDC_BASE_MAINNET: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // USDC on Base Sepolia testnet
  USDC_BASE_SEPOLIA: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

export const NETWORK_CONFIG = {
  BASE_MAINNET: {
    chainId: 8453,
    name: 'base-mainnet',
    rpcUrl: 'https://mainnet.base.org',
    usdcAddress: CONTRACT_ADDRESSES.USDC_BASE_MAINNET,
  },
  BASE_SEPOLIA: {
    chainId: 84532,
    name: 'base-sepolia', 
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: CONTRACT_ADDRESSES.USDC_BASE_SEPOLIA,
  },
} as const;

// CoopEscrow contract deployment parameters
export interface CoopEscrowDeployParams {
  token: string;         // ERC20 token address (e.g., USDC)
  beneficiary: string;   // Project owner address
  goal: bigint;          // Funding goal in token units
  deadline: number;      // Unix timestamp
  minContribution: bigint; // Minimum contribution amount (0 for no minimum)
  creatorContribution: bigint; // Initial contribution from creator
}

// Contract interaction types
export interface ContributionParams {
  contractAddress: string;
  amount: bigint;
  userAddress: string;
}

export interface FinalizationParams {
  contractAddress: string;
  finalAmount: bigint;
  creatorAddress: string;
}

// Contract state types
export interface EscrowState {
  token: string;
  creator: string;
  beneficiary: string;
  goal: bigint;
  deadline: number;
  minContribution: bigint;
  closed: boolean;
  success: boolean;
  total: bigint;
  finalAmount: bigint;
  refundPool: bigint;
}

export interface UserContribution {
  deposited: bigint;
  refundClaimed: boolean;
  refundAmount: bigint;
}

// Event types
export interface ContributedEvent {
  contributor: string;
  amount: bigint;
  totalAfter: bigint;
}

export interface FinalizedEvent {
  success: boolean;
  finalAmount: bigint;
  totalRaised: bigint;
}

export interface RefundedEvent {
  user: string;
  amount: bigint;
}

// Project Registry types
export interface ProjectRegistryData {
  creator: string;
  escrow: string;
  ensName: string;
  metaURI: string;
}

export interface ProjectCreationParams {
  ensName: string;
  escrowAddress: string;
  metaURI: string;
  creatorAddress: string;
}