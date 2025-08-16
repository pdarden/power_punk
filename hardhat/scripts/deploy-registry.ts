import { ethers } from "ethers";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  console.log("🚀 Starting ProjectRegistry deployment to Sepolia...\n");

  if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
    console.error("❌ Missing RPC_URL or PRIVATE_KEY environment variables");
    process.exit(1);
  }

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  try {
    // Check account balance first
    console.log("📊 Checking account details...");
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);

    console.log(`   Address: ${wallet.address}`);
    console.log(`   Balance: ${balanceInEth} ETH\n`);

    // Check if balance is sufficient
    const minBalanceRequired = ethers.parseEther("0.01");
    if (balance < minBalanceRequired) {
      console.error("❌ Insufficient balance for deployment!");
      console.error(`   Required: ~0.01 ETH`);
      console.error(`   Current: ${balanceInEth} ETH`);
      console.error("\n💡 Get Sepolia ETH from: https://sepoliafaucet.com/");
      process.exit(1);
    }

    // Get contract factory
    console.log("📄 Compiling contracts...");
    const contractFactory = await ethers.getContractFactory("ProjectRegistry", wallet);

    // Estimate gas
    console.log("⛽ Estimating gas...");
    const deploymentData = contractFactory.interface.encodeDeploy([]);
    const gasEstimate = await provider.estimateGas({
      data: deploymentData,
    });

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");

    const estimatedCost = gasEstimate * gasPrice;
    const estimatedCostEth = ethers.formatEther(estimatedCost);

    console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    console.log(`   Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`   Estimated cost: ${estimatedCostEth} ETH\n`);

    // Deploy contract
    console.log("🚀 Deploying ProjectRegistry contract...");
    const contract = await contractFactory.deploy({
      gasLimit: gasEstimate + (gasEstimate / 10n), // Add 10% buffer
      gasPrice: gasPrice,
    });

    console.log(`   Transaction hash: ${contract.deploymentTransaction()?.hash}`);
    console.log("   Waiting for confirmation...");

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ Deployment successful!");
    console.log("=====================================");
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log(`📊 Transaction: https://sepolia.etherscan.io/tx/${contract.deploymentTransaction()?.hash}`);
    console.log("=====================================\n");

    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const nextId = await contract.nextId();
    console.log(`   Initial nextId: ${nextId}`);

    console.log("\n🎉 ProjectRegistry successfully deployed to Sepolia!");
    console.log(`\n📝 Save this contract address for your frontend: ${contractAddress}`);

    return contractAddress;

  } catch (error) {
    console.error("❌ Deployment failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        console.error("\n💡 Solution: Add more Sepolia ETH to your account");
        console.error("   Get free ETH from: https://sepoliafaucet.com/");
      } else if (error.message.includes("gas")) {
        console.error("\n💡 Solution: Try adjusting gas settings or check network congestion");
      }
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
