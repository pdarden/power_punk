# PowerPunk Escrow Integration Setup Guide

This guide will help you set up and test the complete escrow contract integration with the PowerPunk platform.

## Prerequisites

- Node.js 18+ installed
- MetaMask or compatible wallet
- Base Sepolia testnet ETH (get from [Base Bridge](https://bridge.base.org/))
- Base Sepolia USDC (get from [Base Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet))

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd power_punk

# Install hardhat dependencies
cd hardhat
npm install

# Install frontend dependencies
cd ../power-punk-app
npm install
```

### 2. Environment Variables

Create `.env` files in both directories:

**`hardhat/.env`:**
```env
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**`power-punk-app/.env.local`:**
```env
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id
NEXT_PUBLIC_WALRUS_API_URL=https://api.walrus.xyz
WALRUS_API_KEY=your_walrus_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contract Deployment

### 1. Deploy ProjectRegistry Contract

```bash
cd hardhat
npx hardhat run scripts/deploy-registry.ts --network baseSepolia
```

This will:
- Deploy the ProjectRegistry contract
- Output the contract address
- Update the frontend registry configuration

### 2. Verify Deployment

Check the deployment on [Base Sepolia Etherscan](https://sepolia.basescan.org/) using the contract address.

## Frontend Setup

### 1. Start Development Server

```bash
cd power-punk-app
npm run dev
```

The application will be available at `http://localhost:3000`

### 2. Connect Wallet

1. Open the application in your browser
2. Connect your MetaMask wallet
3. Ensure you're on Base Sepolia network (Chain ID: 84532)

## Testing the Integration

### Test Case 1: Create Smart Contract Project

1. **Navigate to Project Creation**
   - Go to `/projects/create`
   - Fill out project details
   - Select "Smart Contract Escrow (CoopEscrow)" as escrow type

2. **Review Deployment Parameters**
   - Goal amount: $1000 USDC (example)
   - Minimum contribution: $10 USDC
   - Initial creator contribution: $100 USDC
   - Deadline: 30 days from now

3. **Execute Deployment**
   - Click "Deploy Escrow & Create Project"
   - Approve 4 transactions in sequence:
     - Contract deployment (higher gas cost)
     - USDC approval
     - Initial contribution
     - Registry registration

4. **Verify Success**
   - Project should appear with "Smart Contract Project Created!" message
   - Note the escrow contract address
   - Check transactions on Base Sepolia Etherscan

### Test Case 2: Contribute to Smart Contract Project

1. **Navigate to Project**
   - Find your created project
   - Click "Contribute to Project"

2. **Make Contribution**
   - Select number of units (e.g., 2 units = $20)
   - Click "Contribute X USDC"
   - Approve 2 transactions:
     - USDC approval
     - Contribution to escrow

3. **Verify Contribution**
   - Should see "Contribution Successful!" message
   - Check escrow contract on Etherscan for updated balance
   - Verify contribution tracking

### Test Case 3: Project Finalization (Creator Only)

1. **Access Project Management**
   - As project creator, navigate to project
   - Click "Finalize Project" (if available)

2. **Specify Final Amount**
   - Enter amount to send to beneficiary (must be ≥ goal)
   - Submit finalization transaction

3. **Verify Distribution**
   - Beneficiary receives specified amount
   - Remaining funds available for proportional refunds
   - Contributors can claim their refunds

## Contract Interaction Examples

### Direct Contract Calls (via Hardhat Console)

```bash
cd hardhat
npx hardhat console --network baseSepolia
```

```javascript
// Get contract instances
const registry = await ethers.getContractAt("ProjectRegistry", "REGISTRY_ADDRESS");
const escrow = await ethers.getContractAt("CoopEscrow", "ESCROW_ADDRESS");

// Check project details
const project = await registry.getProject(1);
console.log("Project:", project);

// Check escrow state
const total = await escrow.total();
const goal = await escrow.goal();
const isOpen = await escrow.isOpen();
console.log(`Total: ${ethers.formatUnits(total, 6)} USDC`);
console.log(`Goal: ${ethers.formatUnits(goal, 6)} USDC`);
console.log(`Is Open: ${isOpen}`);

// Check user contribution
const userContribution = await escrow.depositedOf("USER_ADDRESS");
console.log(`User Contribution: ${ethers.formatUnits(userContribution, 6)} USDC`);
```

## Troubleshooting

### Common Issues

#### 1. "Insufficient balance for deployment"
**Solution:** Get more Base Sepolia ETH from the bridge
- Minimum required: ~0.01 ETH for deployment

#### 2. "USDC approval failed"
**Solutions:**
- Check USDC balance: Need sufficient USDC for contributions
- Verify contract address: Ensure escrow address is correct
- Check network: Must be on Base Sepolia

#### 3. "Registry address not found"
**Solution:** Deploy ProjectRegistry first:
```bash
cd hardhat
npx hardhat run scripts/deploy-registry.ts --network baseSepolia
```

#### 4. "Transaction timeout"
**Solutions:**
- Increase gas price during network congestion
- Wait and retry transaction
- Check MetaMask for pending transactions

### Debug Steps

1. **Check Network Connection**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        https://sepolia.base.org
   ```

2. **Verify Contract Deployment**
   - Check contract addresses in `power-punk-app/src/contracts/registry.json`
   - Verify on Base Sepolia Etherscan

3. **Check Wallet State**
   - ETH balance for gas fees
   - USDC balance for contributions
   - Network selection (Base Sepolia)

4. **Monitor Contract Events**
   ```javascript
   // Listen for contribution events
   escrow.on("Contributed", (contributor, amount, total) => {
     console.log(`${contributor} contributed ${ethers.formatUnits(amount, 6)} USDC`);
   });
   ```

## Gas Estimates

| Operation | Estimated Gas | ETH Cost (20 gwei) |
|-----------|---------------|---------------------|
| Deploy Registry | ~500,000 | ~0.01 ETH |
| Deploy Escrow | ~2,000,000 | ~0.04 ETH |
| USDC Approval | ~50,000 | ~0.001 ETH |
| Contribute | ~100,000 | ~0.002 ETH |
| Register Project | ~150,000 | ~0.003 ETH |
| Finalize Project | ~200,000 | ~0.004 ETH |

## Security Considerations

### For Testing
- Use testnet only - never deploy to mainnet without thorough auditing
- Use small amounts for testing contributions
- Verify all contract addresses before deployment

### For Production
- Complete security audit required
- Multi-sig wallet for registry ownership
- Timelock for critical operations
- Emergency pause mechanisms

## Getting Help

### Resources
- [Hardhat Documentation](https://hardhat.org/docs)
- [Base Network Docs](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Common Contract Addresses (Base Sepolia)
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **ProjectRegistry**: `0xEF64bF77B9B6428700fec109a4BcDB44e5434743`

### Support Channels
- Check transaction status on [Base Sepolia Etherscan](https://sepolia.basescan.org/)
- Review contract interactions and events
- Enable debug mode in frontend for detailed error logs

### CDP Setup Instructions
1. Visit [CDP Portal](https://portal.cdp.coinbase.com/projects)
2. Create or select a project
3. Copy the Project ID from your dashboard
4. Add it to your `.env.local` as `NEXT_PUBLIC_CDP_PROJECT_ID`
5. Allowlist your local development URL (http://localhost:3000) in the Embedded Wallet Configuration

## Next Steps

After successful testing:
1. Consider mainnet deployment preparation
2. Implement additional features (milestones, governance)
3. Optimize gas usage for production
4. Set up monitoring and analytics
5. Prepare user documentation and tutorials

Happy testing! 🚀