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
  if (!process.env.RPC_URL || !process.env.PRIVATE_KEY) {
    console.error("Missing RPC_URL or PRIVATE_KEY environment variables");
    process.exit(1);
  }

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  try {
    // Get account balance
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);

    console.log("Account Details:");
    console.log("===============");
    console.log(`Address: ${wallet.address}`);
    console.log(`Balance: ${balanceInEth} ETH`);
    console.log(`Balance (wei): ${balance.toString()}`);

    // Check if balance is sufficient for deployment (rough estimate)
    const minBalanceRequired = ethers.parseEther("0.01"); // 0.01 ETH
    if (balance < minBalanceRequired) {
      console.log("\n⚠️  WARNING: Balance might be too low for deployment");
      console.log(`   Recommended minimum: 0.01 ETH`);
      console.log(`   Current balance: ${balanceInEth} ETH`);
    } else {
      console.log("\n✅ Balance appears sufficient for deployment");
    }

    // Get network info
    const network = await provider.getNetwork();
    console.log("\nNetwork Details:");
    console.log("================");
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`Network Name: ${network.name}`);

  } catch (error) {
    console.error("Error checking balance:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
