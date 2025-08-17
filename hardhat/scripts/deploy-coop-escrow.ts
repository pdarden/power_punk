import { network } from "hardhat";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

interface DeployParams {
  token: string;         // USDC address
  beneficiary: string;   // Project owner 
  goal: bigint;          // Funding goal (in USDC, 6 decimals)
  deadline: number;      // Unix timestamp
  minContribution: bigint; // Minimum contribution (0 for none)
  creatorContribution: bigint; // Initial contribution from creator (will be separate tx)
  ensName: string;       // ENS name for registry
  metaURI: string;       // Metadata URI for registry
}

async function main() {
  console.log("🚀 Starting CoopEscrow deployment to Base Sepolia...\n");

  const [deployer] = await ethers.getSigners();

  try {
    // Check account balance first
    console.log("📊 Checking account details...");
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);

    console.log(`   Address: ${deployer.address}`);
    console.log(`   Balance: ${balanceInEth} ETH\n`);

    // Check if balance is sufficient
    const minBalanceRequired = ethers.parseEther("0.01");
    if (balance < minBalanceRequired) {
      console.error("❌ Insufficient balance for deployment!");
      console.error(`   Required: ~0.01 ETH`);
      console.error(`   Current: ${balanceInEth} ETH`);
      console.error("\n💡 Get Base Sepolia ETH from: https://bridge.base.org/");
      process.exit(1);
    }

    // Default deployment parameters for testing
    const deployParams: DeployParams = {
      token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
      beneficiary: deployer.address, // Creator is beneficiary for testing
      goal: ethers.parseUnits("1000", 6), // 1000 USDC goal
      deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      minContribution: ethers.parseUnits("10", 6), // 10 USDC minimum
      creatorContribution: ethers.parseUnits("100", 6), // 100 USDC initial
      ensName: "test-solar-microgrid.eth",
      metaURI: "ipfs://QmTestProjectMetadata123"
    };

    console.log("📄 Deployment parameters:");
    console.log(`   Token (USDC): ${deployParams.token}`);
    console.log(`   Beneficiary: ${deployParams.beneficiary}`);
    console.log(`   Goal: ${ethers.formatUnits(deployParams.goal, 6)} USDC`);
    console.log(`   Deadline: ${new Date(deployParams.deadline * 1000).toISOString()}`);
    console.log(`   Min Contribution: ${ethers.formatUnits(deployParams.minContribution, 6)} USDC`);
    console.log(`   Creator Contribution: ${ethers.formatUnits(deployParams.creatorContribution, 6)} USDC`);
    console.log(`   ENS Name: ${deployParams.ensName}`);
    console.log(`   Meta URI: ${deployParams.metaURI}\n`);

    // Step 1: Deploy CoopEscrow (following Integration.ts pattern)
    console.log("📄 Step 1: Compiling and deploying CoopEscrow...");
    const CoopEscrowFactory = await ethers.getContractFactory("CoopEscrow");

    // Deploy without creator contribution in constructor (as per Integration.ts pattern)
    const escrow = await CoopEscrowFactory.deploy(
      deployParams.token,
      deployParams.beneficiary,
      deployParams.goal,
      deployParams.deadline,
      deployParams.minContribution,
      0n // No creator contribution in constructor
    );

    console.log(`   Transaction hash: ${escrow.deploymentTransaction()?.hash}`);
    console.log("   Waiting for confirmation...");

    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();

    console.log(`✅ CoopEscrow deployed at: ${escrowAddress}\n`);

    // Step 2: Get or deploy ProjectRegistry
    console.log("📄 Step 2: Setting up ProjectRegistry...");
    
    // Check if we have a deployed registry address
    const registryRegistryPath = path.join(__dirname, "../../power-punk-app/src/contracts/registry.json");
    let registryAddress = "";
    
    if (fs.existsSync(registryRegistryPath)) {
      const registryData = JSON.parse(fs.readFileSync(registryRegistryPath, "utf-8"));
      registryAddress = registryData?.baseSepolia?.contracts?.ProjectRegistry?.address || "";
    }

    let registry;
    if (registryAddress && registryAddress !== "") {
      console.log(`   Using existing ProjectRegistry at: ${registryAddress}`);
      const ProjectRegistryFactory = await ethers.getContractFactory("ProjectRegistry");
      registry = ProjectRegistryFactory.attach(registryAddress);
    } else {
      console.log("   Deploying new ProjectRegistry...");
      const ProjectRegistryFactory = await ethers.getContractFactory("ProjectRegistry");
      registry = await ProjectRegistryFactory.deploy();
      await registry.waitForDeployment();
      registryAddress = await registry.getAddress();
      console.log(`   ProjectRegistry deployed at: ${registryAddress}`);
    }

    // Step 3: Register project in registry
    console.log("\n📄 Step 3: Registering project in registry...");
    const registerTx = await registry.createProject(
      deployParams.ensName,
      escrowAddress,
      deployParams.metaURI
    );
    
    const registerReceipt = await registerTx.wait();
    console.log(`   Registration tx: ${registerTx.hash}`);

    // Extract project ID from event
    const projectCreatedEvent = registerReceipt?.logs.find(
      (log: any) => {
        try {
          const parsed = registry.interface.parseLog(log);
          return parsed?.name === "ProjectCreated";
        } catch {
          return false;
        }
      }
    );
    
    let projectId = 1n; // Default to 1 if we can't find the event
    if (projectCreatedEvent) {
      const parsed = registry.interface.parseLog(projectCreatedEvent);
      projectId = parsed?.args?.[0] || 1n;
    }
    
    console.log(`   Project ID: ${projectId}`);

    // Step 4: Make creator contribution (separate transaction, following Integration.ts pattern)
    if (deployParams.creatorContribution > 0n) {
      console.log("\n📄 Step 4: Making creator contribution...");
      
      // Note: In real deployment, you'd need to approve USDC first
      console.log("   ⚠️  Remember to approve USDC spending first:");
      console.log(`   Token: ${deployParams.token}`);
      console.log(`   Spender: ${escrowAddress}`);
      console.log(`   Amount: ${deployParams.creatorContribution}`);
      console.log(`   Then call: escrow.contribute(${deployParams.creatorContribution})`);
    }

    console.log("\n✅ Deployment completed successfully!");
    console.log("=====================================");
    console.log(`📋 CoopEscrow Address: ${escrowAddress}`);
    console.log(`📋 ProjectRegistry Address: ${registryAddress}`);
    console.log(`📋 Project ID: ${projectId}`);
    console.log(`🔗 Basescan Escrow: https://sepolia.basescan.org/address/${escrowAddress}`);
    console.log(`🔗 Basescan Registry: https://sepolia.basescan.org/address/${registryAddress}`);
    console.log("=====================================\n");

    // Step 5: Update contract registry for frontend
    console.log("📦 Updating contract registry...");
    let registry_json: any = {};

    if (fs.existsSync(registryRegistryPath)) {
      registry_json = JSON.parse(fs.readFileSync(registryRegistryPath, "utf-8"));
    }

    if (!registry_json.baseSepolia) {
      registry_json.baseSepolia = { chainId: 84532, contracts: {} };
    }

    // Update both contracts in registry
    registry_json.baseSepolia.contracts.CoopEscrow = {
      address: escrowAddress,
      blockNumber: (await escrow.deploymentTransaction()?.wait())?.blockNumber || 0,
      abi: "./abi/CoopEscrow.json",
      version: "1.0.0"
    };

    registry_json.baseSepolia.contracts.ProjectRegistry = {
      address: registryAddress,
      blockNumber: registerReceipt?.blockNumber || 0,
      abi: "./abi/ProjectRegistry.json", 
      version: "1.0.0"
    };

    fs.writeFileSync(registryRegistryPath, JSON.stringify(registry_json, null, 2));
    console.log("✅ Updated registry.json");

    // Step 6: Save ABIs to frontend
    const abiDir = path.join(__dirname, "../../power-punk-app/src/contracts/abi");
    fs.mkdirSync(abiDir, { recursive: true });

    const escrowAbiPath = path.join(abiDir, "CoopEscrow.json");
    const registryAbiPath = path.join(abiDir, "ProjectRegistry.json");

    // Get the ABIs from the compiled artifacts
    const escrowArtifact = await import("../artifacts/contracts/CoopEscrow.sol/CoopEscrow.json", {
      assert: { type: "json" }
    });
    const registryArtifact = await import("../artifacts/contracts/ProjectRegistry.sol/ProjectRegistry.json", {
      assert: { type: "json" }
    });

    fs.writeFileSync(escrowAbiPath, JSON.stringify(escrowArtifact.default.abi, null, 2));
    fs.writeFileSync(registryAbiPath, JSON.stringify(registryArtifact.default.abi, null, 2));
    console.log("✅ ABIs saved to /contracts/abi/");

    // Step 7: Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const goal = await escrow.goal();
    const deadline = await escrow.deadline();
    const beneficiary = await escrow.beneficiary();
    const creator = await escrow.creator();
    const total = await escrow.total();
    
    console.log(`   Goal: ${ethers.formatUnits(goal, 6)} USDC`);
    console.log(`   Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log(`   Beneficiary: ${beneficiary}`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Current Total: ${ethers.formatUnits(total, 6)} USDC`);

    // Verify registry
    const project = await registry.getProject(projectId);
    console.log(`   Registry Creator: ${project.creator}`);
    console.log(`   Registry Escrow: ${project.escrow}`);
    console.log(`   Registry ENS: ${project.ensName}`);

    console.log("\n🎉 CoopEscrow + ProjectRegistry successfully deployed!");
    console.log(`\n📝 Summary for frontend integration:`);
    console.log(`   - Escrow Contract: ${escrowAddress}`);
    console.log(`   - Registry Contract: ${registryAddress}`);
    console.log(`   - Project ID: ${projectId}`);
    console.log(`   - Registry JSON updated with contract addresses`);
    console.log(`   - ABIs saved for frontend use`);

    return { escrowAddress, registryAddress, projectId };

  } catch (error) {
    console.error("❌ Deployment failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        console.error("\n💡 Solution: Add more Base Sepolia ETH to your account");
        console.error("   Get free ETH from: https://bridge.base.org/");
      } else if (error.message.includes("gas")) {
        console.error("\n💡 Solution: Try adjusting gas settings or check network congestion");
      } else if (error.message.includes("InvalidParams")) {
        console.error("\n💡 Solution: Check deployment parameters (deadline, amounts, addresses)");
      }
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});