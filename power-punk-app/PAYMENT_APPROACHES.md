# Payment Integration Approaches

This document outlines two distinct payment approaches for Power Punk's crowdfunding platform using Coinbase Embedded Wallets for seamless user transactions.

## Overview

Power Punk supports dual escrow mechanisms for project funding:

1. **Smart Contract Escrow (GrassrootsCrowdfunding)** - Trustless, blockchain-based escrow
2. **Agent Escrow (Coinbase AgentKit)** - AI-managed server wallet with intelligent distribution

Both approaches use **Coinbase Embedded Wallets** for user authentication and transaction signing, with **USDC on Base Network** for payments.

---

## Approach 1: Smart Contract Escrow

### Architecture

The smart contract approach uses the `GrassrootsCrowdfunding.sol` contract deployed on Base Network for trustless escrow management.

### Contract Features

- **Trustless Escrow**: Funds locked in smart contract until deadline
- **Automatic Refunds**: Contributors get refunds if funding goal not met
- **Reward Distribution**: Proportional rewards when funding exceeds goal
- **Referral System**: Built-in referral tracking and bonus calculations
- **Owner Payouts**: Automatic fund release to project owner on success

### Implementation Flow

#### Project Creation
```typescript
// 1. Deploy new GrassrootsCrowdfunding contract
const contractArgs = {
  _usdcToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  _fundingGoal: parseUnits(goalAmount.toString(), 6),
  _unitCost: parseUnits(unitCost.toString(), 6),  
  _costSavingsPerUnit: parseUnits(savings.toString(), 6),
  _deadline: Math.floor(new Date(endDate).getTime() / 1000),
  _initialContribution: parseUnits(initialAmount.toString(), 6)
};

// 2. Use CDP Embedded Wallet to deploy contract
const { deployContract } = useSendEvmTransaction();
const contractAddress = await deployContract({
  contractBytecode: GRASSROOTS_BYTECODE,
  constructorArgs: contractArgs,
  network: 'base-mainnet'
});

// 3. Store contract address in Supabase
await supabase.from('campaigns').insert({
  contract_address: contractAddress,
  escrow_type: 'contract'
});
```

#### User Contributions
```typescript
// 1. Calculate contribution amount
const contributionAmount = units * unitPrice;
const amountInWei = parseUnits(contributionAmount.toString(), 6);

// 2. Approve USDC spending (if needed)
const { sendEvmTransaction } = useSendEvmTransaction();
await sendEvmTransaction({
  transaction: {
    to: USDC_CONTRACT_ADDRESS,
    data: `0x095ea7b3${contractAddress.slice(2).padStart(64, '0')}${amountInWei.toString(16).padStart(64, '0')}`,
    chainId: 8453
  }
});

// 3. Call contract contribute function
await sendEvmTransaction({
  transaction: {
    to: contractAddress,
    data: `0x6b69a592${amountInWei.toString(16).padStart(64, '0')}${referrerAddress.slice(2).padStart(64, '0')}`,
    chainId: 8453
  }
});
```

#### Project Completion
```typescript
// Automatic execution after deadline:
// - If goal reached: payout() called to distribute funds and rewards
// - If goal not reached: refundAll() called for contributor refunds

// Manual claim functions available:
// - claimReward() for individual reward claiming
// - claimRefund() for individual refund claiming
```

### Advantages
- **Trustless**: No intermediary required
- **Transparent**: All logic on-chain and auditable  
- **Automatic**: Built-in refund/payout mechanisms
- **Gas Efficient**: Optimized Solidity implementation
- **Immutable**: Contract terms cannot be changed

### Considerations
- **Fixed Logic**: Reward calculations are predetermined
- **Gas Costs**: Users pay gas for transactions
- **Complexity**: Requires smart contract deployment

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
// Transaction signing for both approaches
import { useSendEvmTransaction } from '@coinbase/cdp-hooks';

const { sendEvmTransaction } = useSendEvmTransaction();

// Users only need to sign transactions, not manage private keys
const result = await sendEvmTransaction({
  transaction: transactionData,
  evmAccount: userAddress,
  network: 'base-mainnet'
});
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

## Recommendation

For **Power Punk's MVP**, both approaches offer distinct advantages:

- **Smart Contract Escrow**: Ideal for users who prefer trustless, transparent systems
- **Agent Escrow**: Better for complex project types requiring adaptive logic

The dual approach allows users to choose based on their preferences and project requirements, maximizing platform adoption and flexibility.