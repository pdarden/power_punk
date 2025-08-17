# Payment Integration Approaches

This document outlines two distinct payment approaches for Power Punk's crowdfunding platform using Coinbase Embedded Wallets for seamless user transactions.

## Overview

Power Punk supports dual escrow mechanisms for project funding:

1. **Smart Contract Escrow (GrassrootsCrowdfunding)** - Trustless, blockchain-based escrow
2. **Agent Escrow (Coinbase AgentKit)** - AI-managed server wallet with intelligent distribution

Both approaches use **Coinbase Embedded Wallets** for user authentication and transaction signing, with **USDC on Base Network** for payments.

---

## Approach 1: Smart Contract Escrow (Simplified CoopEscrow with Registry)

### Architecture

The smart contract approach uses a **shared escrow pattern** with the simplified `CoopEscrow.sol` contract and `ProjectRegistry.sol` contract deployed on Base Sepolia. This streamlined architecture is more efficient than deploying individual contracts per project.

### Contract Features

- **Shared Escrow Contract**: Single CoopEscrow contract handles multiple projects efficiently
- **Project Registry**: On-chain registry tracking all projects with their metadata
- **Creator-Controlled Finalization**: Only project creator can finalize and specify final amount to beneficiary
- **Proportional Excess Refunds**: When funding exceeds goal, contributors get proportional refunds of excess
- **Full Refunds for Failed Projects**: Complete refund system if goal not met
- **Flexible ERC-20 Support**: Works with any ERC-20 token (USDC, PYUSD, etc.)

### Deployed Contracts (Base Sepolia)

- **CoopEscrow**: `0x2f277A31BAA2fccc25Ad8927da6d15aC1D13C1e1`
- **ProjectRegistry**: `0xEF64bF77B9B6428700fec109a4BcDB44e5434743`
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Implementation Flow

#### Project Creation
```typescript
import { 
  createProjectRegistrationTransaction, 
  createContributionTransactions,
  getDeployedContracts 
} from '@/contracts/coopEscrow';

// 1. Get deployed contract addresses
const contracts = getDeployedContracts(true); // Use testnet

// 2. Register project in registry
const ensName = projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.eth';
const metaURI = `ipfs://walrus/${walrusId}`;

const registrationTx = createProjectRegistrationTransaction(
  ensName,
  contracts.CoopEscrow.address,
  metaURI
);

const { transactionHash: regHash } = await sendEvmTransaction({
  transaction: registrationTx,
  evmAccount: userAddress,
  network: 'base-sepolia'
});

// 3. Make initial creator contribution
const { approvalTx, contributionTx } = createContributionTransactions({
  contractAddress: contracts.CoopEscrow.address,
  amount: parseUSDCAmount(initialAmount),
  userAddress: userAddress,
});

// Approve USDC spending
await sendEvmTransaction({
  transaction: approvalTx,
  evmAccount: userAddress,
  network: 'base-sepolia'
});

// Make contribution
await sendEvmTransaction({
  transaction: contributionTx,
  evmAccount: userAddress,
  network: 'base-sepolia'
});
```

#### User Contributions
```typescript
import { createContributionTransactions, parseUSDCAmount } from '@/contracts/coopEscrow';

// 1. Create contribution transactions
const contributionAmount = parseUSDCAmount(amount);
const { approvalTx, contributionTx } = createContributionTransactions({
  contractAddress: contracts.CoopEscrow.address,
  amount: contributionAmount,
  userAddress: userAddress,
});

// 2. Approve USDC spending
const { transactionHash: approvalHash } = await sendEvmTransaction({
  transaction: approvalTx,
  evmAccount: userAddress,
  network: 'base-sepolia'
});

// 3. Make contribution to shared escrow
const { transactionHash: contributionHash } = await sendEvmTransaction({
  transaction: contributionTx,
  evmAccount: userAddress,
  network: 'base-sepolia'
});
```

#### Project Completion
```typescript
// Creator-controlled finalization (must be >= goal amount)
if (totalRaised >= goal) {
  // Creator specifies final amount to send to beneficiary
  const finalAmount = parseUnits(desiredAmount.toString(), 6); // Must be >= goal
  await sendEvmTransaction({
    transaction: {
      to: contractAddress,
      data: `0x4bb278f3${finalAmount.toString(16).padStart(64, '0')}`, // finalize(uint256)
      chainId: 8453
    }
  });
  
  // Contributors can claim proportional refunds of excess funds
  // Refund = (userContribution / totalRaised) * (totalRaised - finalAmount)
  await sendEvmTransaction({
    transaction: {
      to: contractAddress,
      data: `0x590e1ae3`, // claimRefund()
      chainId: 8453
    }
  });
} else {
  // If goal not reached, contributors get full refunds
  await sendEvmTransaction({
    transaction: {
      to: contractAddress,
      data: `0x590e1ae3`, // refund() - full refund
      chainId: 8453
    }
  });
}
```

### Advantages
- **Shared Escrow Efficiency**: Single contract serves multiple projects, reducing deployment costs
- **Registry Pattern**: On-chain project tracking with metadata storage
- **Minimal & Trustless**: Simplified, secure escrow with no intermediary required
- **Transparent**: All logic on-chain and auditable
- **Creator Control**: Project creator decides final amount to beneficiary
- **Flexible Refunds**: Proportional excess refunds + full refunds for failed projects
- **Gas Efficient**: Streamlined implementation with fewer features
- **Pre-deployed Contracts**: No deployment wait time, immediate project creation

### Considerations
- **Simplified Logic**: No complex reward calculations or referral systems
- **Gas Costs**: Users pay gas for transactions
- **Creator Trust**: Requires trust in creator to finalize appropriately
- **Shared Contract**: Single point of failure for all projects (mitigated by auditing)
- **No Automatic Execution**: Manual finalization required by creator

---

## Approach 2: Agent Escrow (Coinbase AgentKit)

### Architecture

The agent approach creates a dedicated Coinbase server wallet for each project, managed by an AI agent that makes intelligent decisions about fund distribution.

### Agent Features

- **AI-Powered Decisions**: OpenAI integration for distribution logic
- **Flexible Logic**: Can adapt to project-specific requirements  
- **Server Wallets**: Coinbase-managed wallets with programmatic access
- **Custom Algorithms**: Tailored reward and refund calculations
- **Real-time Processing**: Immediate transaction processing

### Implementation Flow

#### Project Creation
```typescript
// 1. Create Coinbase server wallet for project
import { createWallet } from '@/lib/coinbase/agentkit';

const projectWallet = await createWallet({
  projectId: campaignId,
  projectType: formData.projectType,
  goalAmount: parseFloat(formData.goalAmount),
  deadline: formData.endDate
});

// 2. Store wallet details in database
await supabase.from('project_wallets').insert({
  campaign_id: campaignId,
  wallet_address: projectWallet.address,
  agent_id: projectWallet.agentId,
  escrow_type: 'agent'
});

// 3. Initial contribution from project creator
const { sendEvmTransaction } = useSendEvmTransaction();
await sendEvmTransaction({
  transaction: {
    to: USDC_CONTRACT_ADDRESS,
    data: `0xa9059cbb000000000000000000000000${projectWallet.address.slice(2)}${initialAmountWei.toString(16).padStart(64, '0')}`,
    chainId: 8453
  }
});
```

#### User Contributions
```typescript
// 1. Users send USDC directly to project wallet
const { sendEvmTransaction } = useSendEvmTransaction();
const contributionTx = await sendEvmTransaction({
  transaction: {
    to: USDC_CONTRACT_ADDRESS,
    data: `0xa9059cbb000000000000000000000000${projectWalletAddress.slice(2)}${amountInWei.toString(16).padStart(64, '0')}`,
    chainId: 8453
  }
});

// 2. Record contribution in database
await fetch('/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    campaignId,
    amount: contributionAmount,
    units,
    fromWallet: userAddress,
    toWallet: projectWalletAddress,
    transactionHash: contributionTx.hash,
    referrer: referrerAddress
  })
});

// 3. Agent processes and acknowledges contribution
await agent.processContribution({
  contributorAddress: userAddress,
  amount: contributionAmount,
  transactionHash: contributionTx.hash
});
```

#### Project Completion
```typescript
// Agent evaluates project at deadline
const agent = await getProjectAgent(campaignId);

if (await agent.isGoalReached()) {
  // Distribute funds and rewards
  const distribution = await agent.calculateDistribution();
  
  for (const payout of distribution.payouts) {
    await agent.sendPayment({
      to: payout.address,
      amount: payout.amount,
      type: payout.type // 'owner_payout', 'reward', 'bonus'
    });
  }
} else {
  // Process refunds
  const contributors = await agent.getContributors();
  
  for (const contributor of contributors) {
    await agent.sendRefund({
      to: contributor.address,
      amount: contributor.totalContributed
    });
  }
}
```

### Agent Intelligence Examples
```typescript
// Custom reward calculation with AI analysis
const rewardCalculation = await agent.calculateRewards({
  totalRaised,
  goalAmount,
  contributors,
  projectType,
  impactMetrics: await agent.analyzeProjectImpact()
});

// Adaptive referral bonuses
const referralBonus = await agent.calculateReferralBonus({
  referrer,
  referredCount,
  totalRaised,
  communityEngagement: await agent.analyzeCommunityMetrics()
});
```

### Advantages
- **Intelligent**: AI-powered decision making
- **Flexible**: Custom logic per project type
- **Gasless**: Agent covers transaction costs
- **Real-time**: Immediate processing and updates
- **Adaptive**: Can learn and improve over time

### Considerations
- **Trust Required**: Users trust agent to execute properly
- **Centralized Element**: Coinbase server wallet dependency
- **Complexity**: Requires AI agent development
- **Monitoring**: Need oversight of agent decisions

---

## Technical Implementation Details

### Coinbase Embedded Wallet Integration

Both approaches leverage CDP Embedded Wallets for user interactions:

```typescript
// Dual contribution flow support
import { useSendEvmTransaction } from '@coinbase/cdp-hooks';
import { 
  createContributionTransactions, 
  getNetworkConfig 
} from '@/contracts/coopEscrow';

const { sendEvmTransaction } = useSendEvmTransaction();

// Contract escrow flow (shared CoopEscrow)
if (escrowType === 'contract') {
  const { approvalTx, contributionTx } = createContributionTransactions({
    contractAddress: escrowAddress,
    amount: contributionAmount,
    userAddress: evmAddress,
  });

  // Two-step process: approve then contribute
  await sendEvmTransaction({ transaction: approvalTx, evmAccount: userAddress, network: 'base-sepolia' });
  await sendEvmTransaction({ transaction: contributionTx, evmAccount: userAddress, network: 'base-sepolia' });
  
} else {
  // Agent wallet flow (direct USDC transfer)
  const networkConfig = getNetworkConfig();
  const transferTx = {
    to: networkConfig.usdcAddress,
    data: `0xa9059cbb000000000000000000000000${projectWalletAddress.slice(2)}${contributionAmount.toString(16).padStart(64, '0')}`,
    gas: BigInt(65000),
    chainId: networkConfig.chainId,
    type: 'eip1559'
  };
  
  await sendEvmTransaction({ transaction: transferTx, evmAccount: userAddress, network: 'base-sepolia' });
}
```

### Message Signing for Verification
```typescript
import { useSignMessage } from '@coinbase/cdp-hooks';

const { signMessage } = useSignMessage();

// Sign contribution intent
const signature = await signMessage({
  message: `Contributing ${amount} USDC to project ${projectId}`,
  evmAccount: userAddress
});
```

### USDC Token Integration

Both approaches use the same USDC contract on Base:

```typescript
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Standard ERC20 transfer function signature
const transferData = `0xa9059cbb000000000000000000000000${recipientAddress.slice(2)}${amountInWei.toString(16).padStart(64, '0')}`;
```

---

## Comparison Matrix

| Feature | Smart Contract Escrow | Agent Escrow |
|---------|----------------------|--------------|
| **Trust Model** | Trustless | Agent-mediated |
| **Flexibility** | Fixed logic | AI-adaptable |
| **Gas Costs** | User pays | Agent covers |
| **Transparency** | Fully on-chain | Database + agent logs |
| **Deployment** | Contract deploy | Wallet creation |
| **Customization** | Limited | Highly flexible |
| **Speed** | Block confirmation | Real-time |
| **Complexity** | High (Solidity) | High (AI agent) |

---

---

## Simplified Contract Design

The current `CoopEscrow.sol` contract represents a significant simplification from the original `GrassrootsCrowdfunding.sol` contract originally designed by Nora. Here are the key changes:

### Removed Features (from Original GrassrootsCrowdfunding)
- **Complex Reward System**: No automatic reward calculations based on cost savings
- **Referral Tracking**: No built-in referral bonuses or tracking
- **Unit-based Pricing**: No unit costs or bulk discount mechanisms  
- **Automatic Payout Logic**: No automatic execution after deadline
- **Multiple Contribution Types**: Simplified to basic ERC-20 contributions only

### Simplified Features (in CoopEscrow)
- **Minimal Escrow Logic**: Basic contribution collection and fund holding
- **Creator-Controlled Finalization**: Only project creator can decide final distribution
- **Binary Outcome**: Success (>= goal) or failure (< goal) with appropriate refund logic
- **Proportional Excess Refunds**: Simple math for distributing unused funds
- **Immutable Parameters**: All critical parameters set at deployment time

### Why This Simplification?
The simplified `CoopEscrow` contract focuses on the core escrow functionality while removing complex business logic that can be handled off-chain or in higher-level application layers. This approach:

1. **Reduces Gas Costs**: Fewer computations and storage operations
2. **Improves Security**: Smaller attack surface with fewer features
3. **Enhances Auditability**: Easier to verify and understand contract behavior
4. **Increases Flexibility**: Business logic can evolve without contract changes

### Reference to Original Design
The original `GrassrootsCrowdfunding.sol` contract (documented in `power-punk-app/soliditycontracts/escrowcontract.md`) included sophisticated features like:
- Dynamic reward pools based on excess funding and cost savings
- Complex referral bonus calculations 
- Unit-based contribution tracking with bulk pricing
- Automatic reward distribution mechanisms
- Multi-stage project lifecycle management

While these features provided rich functionality, the simplified `CoopEscrow` approach prioritizes security, simplicity, and gas efficiency for the MVP implementation.

---

## Recommendation

For **Power Punk's MVP**, both approaches offer distinct advantages:

- **Smart Contract Escrow (CoopEscrow)**: Ideal for users who prefer minimal, trustless systems with creator control
- **Agent Escrow**: Better for complex project types requiring adaptive logic and automated decision-making

The dual approach allows users to choose based on their preferences and project requirements, maximizing platform adoption and flexibility.