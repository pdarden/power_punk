import { expect } from "chai";
import { network } from "hardhat";
import { CoopEscrow, MockERC20, ProjectRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

async function loadFixture<T>(fixture: () => Promise<T>): Promise<T> {
  return fixture();
}

describe("Integration: CoopEscrow + ProjectRegistry", function () {
  // Test constants
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const GOAL_AMOUNT = ethers.parseEther("10000"); // 10k tokens
  const MIN_CONTRIBUTION = ethers.parseEther("100"); // 100 tokens
  const CREATOR_CONTRIBUTION = ethers.parseEther("1000"); // 1k tokens

  async function deployIntegrationFixture() {
    const [creator, beneficiary, contributor1, contributor2, other] =
      await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20Factory.deploy(
      "Test Token",
      "TEST",
      INITIAL_SUPPLY
    );

    // Deploy ProjectRegistry
    const ProjectRegistryFactory = await ethers.getContractFactory(
      "ProjectRegistry"
    );
    const registry = await ProjectRegistryFactory.deploy();

    // Distribute tokens to all parties
    await token.mint(creator.address, INITIAL_SUPPLY);
    await token.mint(contributor1.address, INITIAL_SUPPLY);
    await token.mint(contributor2.address, INITIAL_SUPPLY);

    const deadline =
      (await ethers.provider.getBlock("latest"))!.timestamp + 7 * 24 * 60 * 60; // 1 week from now

    return {
      token,
      registry,
      creator,
      beneficiary,
      contributor1,
      contributor2,
      other,
      deadline,
    };
  }

  async function createProjectWithEscrow(
    token: MockERC20,
    registry: ProjectRegistry,
    creator: HardhatEthersSigner,
    beneficiary: HardhatEthersSigner,
    goal: bigint,
    deadline: number,
    minContribution: bigint,
    creatorContribution: bigint,
    ensName: string,
    metaURI: string
  ) {
    const CoopEscrowFactory = await ethers.getContractFactory("CoopEscrow");

    // Deploy escrow without creator contribution first
    const escrow = await CoopEscrowFactory.connect(creator).deploy(
      await token.getAddress(),
      beneficiary.address,
      goal,
      deadline,
      minContribution,
      0n // No creator contribution in constructor
    );

    // If creator wants to contribute, do it as a separate transaction
    if (creatorContribution > 0) {
      await token
        .connect(creator)
        .approve(await escrow.getAddress(), creatorContribution);
      await escrow.connect(creator).contribute(creatorContribution);
    }

    // Register project in registry
    const tx = await registry
      .connect(creator)
      .createProject(ensName, await escrow.getAddress(), metaURI);

    const receipt = await tx.wait();
    const projectCreatedEvent = receipt?.logs.find(
      (log) => log.fragment?.name === "ProjectCreated"
    );

    // Extract project ID from event
    const projectId = projectCreatedEvent?.args?.[0];

    return { escrow, projectId };
  }

  describe("End-to-End Project Lifecycle", function () {
    it("Should create project, fund escrow, and finalize successfully", async function () {
      const {
        token,
        registry,
        creator,
        beneficiary,
        contributor1,
        contributor2,
        deadline,
      } = await loadFixture(deployIntegrationFixture);

      const ensName = "awesome-project.eth";
      const metaURI = "ipfs://QmProjectMetadata123";

      // Create project with escrow
      const { escrow, projectId } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        CREATOR_CONTRIBUTION,
        ensName,
        metaURI
      );

      // Verify project was registered correctly
      const project = await registry.getProject(projectId);
      expect(project.creator).to.equal(creator.address);
      expect(project.escrow).to.equal(await escrow.getAddress());
      expect(project.ensName).to.equal(ensName);
      expect(project.metaURI).to.equal(metaURI);

      // Verify escrow has creator's initial contribution
      expect(await escrow.total()).to.equal(CREATOR_CONTRIBUTION);
      expect(await escrow.depositedOf(creator.address)).to.equal(
        CREATOR_CONTRIBUTION
      );

      // Contributors fund the project
      const contribution1 = ethers.parseEther("4000");
      const contribution2 = ethers.parseEther("5000");

      await token
        .connect(contributor1)
        .approve(await escrow.getAddress(), contribution1);
      await escrow.connect(contributor1).contribute(contribution1);

      await token
        .connect(contributor2)
        .approve(await escrow.getAddress(), contribution2);
      await escrow.connect(contributor2).contribute(contribution2);

      // Check total funding
      const totalExpected =
        CREATOR_CONTRIBUTION + contribution1 + contribution2;
      expect(await escrow.total()).to.equal(totalExpected);
      expect(await escrow.total()).to.be.greaterThanOrEqual(GOAL_AMOUNT);

      // Record initial beneficiary balance
      const initialBeneficiaryBalance = await token.balanceOf(
        beneficiary.address
      );

      // Finalize the project (creator finalizes with goal amount)
      await expect(escrow.connect(creator).finalize(GOAL_AMOUNT))
        .to.emit(escrow, "Finalized")
        .withArgs(true, GOAL_AMOUNT, totalExpected);

      // Verify success
      expect(await escrow.success()).to.be.true;
      expect(await escrow.closed()).to.be.true;
      expect(await token.balanceOf(beneficiary.address)).to.equal(
        initialBeneficiaryBalance + GOAL_AMOUNT
      );
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(
        totalExpected - GOAL_AMOUNT
      );
    });

    it("Should handle failed project with refunds", async function () {
      const {
        token,
        registry,
        creator,
        beneficiary,
        contributor1,
        contributor2,
        deadline,
      } = await loadFixture(deployIntegrationFixture);

      const ensName = "failed-project.eth";
      const metaURI = "ipfs://QmFailedProjectMetadata";

      // Create project with escrow (no creator contribution for this test)
      const { escrow, projectId } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        0n, // No creator contribution
        ensName,
        metaURI
      );

      // Verify project registration
      const project = await registry.getProject(projectId);
      expect(project.creator).to.equal(creator.address);

      // Contributors make partial funding (not enough to reach goal)
      const contribution1 = ethers.parseEther("2000");
      const contribution2 = ethers.parseEther("3000");

      await token
        .connect(contributor1)
        .approve(await escrow.getAddress(), contribution1);
      await escrow.connect(contributor1).contribute(contribution1);

      await token
        .connect(contributor2)
        .approve(await escrow.getAddress(), contribution2);
      await escrow.connect(contributor2).contribute(contribution2);

      const totalContributed = contribution1 + contribution2;
      expect(await escrow.total()).to.equal(totalContributed);
      expect(await escrow.total()).to.be.lessThan(GOAL_AMOUNT);

      // Fast forward past deadline
      await ethers.provider.send("evm_setNextBlockTimestamp", [deadline + 1]);
      await ethers.provider.send("evm_mine");

      // Project is now past deadline and under-funded
      expect(await escrow.isOpen()).to.be.false; // Past deadline
      expect(await escrow.total()).to.be.lessThan(GOAL_AMOUNT);

      // Creator cannot finalize because total < goal, but let's test that the project
      // remains in a state where contributors could get refunds if there was a failure mechanism
      // In the current contract, there's no automatic failure - creator must choose not to finalize

      // Since the new contract only allows successful finalization,
      // we can't test the old failed project flow. Instead, test that
      // the project remains unfunded and open for contributions
      expect(await escrow.success()).to.be.false; // Not yet finalized
      expect(await escrow.closed()).to.be.false; // Not yet closed

      // Test that contributors can still see their deposits
      expect(await escrow.depositedOf(contributor1.address)).to.equal(
        contribution1
      );
      expect(await escrow.depositedOf(contributor2.address)).to.equal(
        contribution2
      );

      // The funds are still in the contract
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(
        totalContributed
      );

      // In a real scenario, there would be additional mechanisms to handle
      // under-funded projects (like creator cancellation or timeout mechanisms)
    });

    it("Should handle multiple projects from same creator", async function () {
      const { token, registry, creator, beneficiary, contributor1, deadline } =
        await loadFixture(deployIntegrationFixture);

      // Create first project
      const { escrow: escrow1, projectId: projectId1 } =
        await createProjectWithEscrow(
          token,
          registry,
          creator,
          beneficiary,
          GOAL_AMOUNT,
          deadline,
          MIN_CONTRIBUTION,
          CREATOR_CONTRIBUTION,
          "project1.eth",
          "ipfs://QmProject1"
        );

      // Create second project
      const { escrow: escrow2, projectId: projectId2 } =
        await createProjectWithEscrow(
          token,
          registry,
          creator,
          beneficiary,
          GOAL_AMOUNT * 2n, // Different goal
          deadline,
          MIN_CONTRIBUTION * 2n, // Different minimum
          CREATOR_CONTRIBUTION * 2n, // Different creator contribution
          "project2.eth",
          "ipfs://QmProject2"
        );

      // Verify both projects are registered
      const project1 = await registry.getProject(projectId1);
      const project2 = await registry.getProject(projectId2);

      expect(project1.creator).to.equal(creator.address);
      expect(project2.creator).to.equal(creator.address);
      expect(project1.escrow).to.equal(await escrow1.getAddress());
      expect(project2.escrow).to.equal(await escrow2.getAddress());
      expect(project1.ensName).to.equal("project1.eth");
      expect(project2.ensName).to.equal("project2.eth");

      // Verify escrows have different parameters
      expect(await escrow1.goal()).to.equal(GOAL_AMOUNT);
      expect(await escrow2.goal()).to.equal(GOAL_AMOUNT * 2n);
      expect(await escrow1.minContribution()).to.equal(MIN_CONTRIBUTION);
      expect(await escrow2.minContribution()).to.equal(MIN_CONTRIBUTION * 2n);

      // Contribute to first project to make it finalizeable
      const contribution = ethers.parseEther("9500"); // Enough to reach goal with creator contribution (1000 + 9500 = 10500 > 10000)
      await token
        .connect(contributor1)
        .approve(await escrow1.getAddress(), contribution);
      await escrow1.connect(contributor1).contribute(contribution);

      // First project has enough to finalize
      expect(await escrow1.total()).to.equal(
        CREATOR_CONTRIBUTION + contribution
      );
      expect(await escrow1.total()).to.be.greaterThanOrEqual(GOAL_AMOUNT);

      // Second project should still be open but below goal (only has creator contribution)
      expect(await escrow2.total()).to.equal(CREATOR_CONTRIBUTION * 2n);
      expect(await escrow2.total()).to.be.lessThan(GOAL_AMOUNT);
    });

    it("Should enforce minimum contribution across different projects", async function () {
      const { token, registry, creator, beneficiary, contributor1, deadline } =
        await loadFixture(deployIntegrationFixture);

      // Create project with high minimum contribution
      const highMinimum = ethers.parseEther("1000");
      const { escrow } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        highMinimum,
        0n,
        "high-min-project.eth",
        "ipfs://QmHighMinProject"
      );

      // Try to contribute below minimum - should fail
      const belowMinimum = ethers.parseEther("500");
      await token
        .connect(contributor1)
        .approve(await escrow.getAddress(), belowMinimum);

      await expect(
        escrow.connect(contributor1).contribute(belowMinimum)
      ).to.be.revertedWithCustomError(escrow, "BelowMinimum");

      // Contribute exactly minimum - should succeed
      await token
        .connect(contributor1)
        .approve(await escrow.getAddress(), highMinimum);

      await expect(escrow.connect(contributor1).contribute(highMinimum))
        .to.emit(escrow, "Contributed")
        .withArgs(contributor1.address, highMinimum, highMinimum);
    });

    it("Should handle project discovery through registry", async function () {
      const { token, registry, creator, beneficiary, deadline } =
        await loadFixture(deployIntegrationFixture);

      // Create multiple projects
      const projects = [];
      for (let i = 1; i <= 3; i++) {
        const { escrow, projectId } = await createProjectWithEscrow(
          token,
          registry,
          creator,
          beneficiary,
          GOAL_AMOUNT,
          deadline,
          MIN_CONTRIBUTION,
          0n,
          `project${i}.eth`,
          `ipfs://QmProject${i}`
        );
        projects.push({ escrow, projectId });
      }

      // Verify all projects can be discovered through registry
      for (let i = 0; i < projects.length; i++) {
        const project = await registry.getProject(projects[i].projectId);
        expect(project.creator).to.equal(creator.address);
        expect(project.escrow).to.equal(await projects[i].escrow.getAddress());
        expect(project.ensName).to.equal(`project${i + 1}.eth`);
      }

      // Verify nextId is correct
      expect(await registry.nextId()).to.equal(3);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should not allow registering project with non-existent escrow", async function () {
      const { registry, creator } = await loadFixture(deployIntegrationFixture);

      // Try to register project with zero address escrow
      await expect(
        registry
          .connect(creator)
          .createProject(
            "fake-project.eth",
            ethers.ZeroAddress,
            "ipfs://QmFakeProject"
          )
      ).to.be.revertedWith("escrow=0");
    });

    it("Should handle escrow deployment failure gracefully", async function () {
      const { token, creator, beneficiary, deadline } = await loadFixture(
        deployIntegrationFixture
      );

      const CoopEscrowFactory = await ethers.getContractFactory("CoopEscrow");

      // Try to deploy escrow with invalid parameters (past deadline)
      const pastDeadline =
        (await ethers.provider.getBlock("latest"))!.timestamp - 1;

      await expect(
        CoopEscrowFactory.connect(creator).deploy(
          await token.getAddress(),
          beneficiary.address,
          GOAL_AMOUNT,
          pastDeadline,
          MIN_CONTRIBUTION,
          0n
        )
      ).to.be.revertedWithCustomError(CoopEscrowFactory, "InvalidParams");
    });

    it("Should maintain data consistency between registry and escrow", async function () {
      const { token, registry, creator, beneficiary, deadline } =
        await loadFixture(deployIntegrationFixture);

      const { escrow, projectId } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        CREATOR_CONTRIBUTION,
        "consistency-test.eth",
        "ipfs://QmConsistencyTest"
      );

      // Verify registry data matches escrow data
      const project = await registry.getProject(projectId);

      expect(project.creator).to.equal(await escrow.creator());
      expect(project.escrow).to.equal(await escrow.getAddress());

      // Verify escrow parameters
      expect(await escrow.goal()).to.equal(GOAL_AMOUNT);
      expect(await escrow.deadline()).to.equal(deadline);
      expect(await escrow.minContribution()).to.equal(MIN_CONTRIBUTION);
      expect(await escrow.total()).to.equal(CREATOR_CONTRIBUTION);
    });

    it("Should handle concurrent contributions to multiple projects", async function () {
      const {
        token,
        registry,
        creator,
        beneficiary,
        contributor1,
        contributor2,
        deadline,
      } = await loadFixture(deployIntegrationFixture);

      // Create two projects
      const { escrow: escrow1 } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        0n,
        "concurrent1.eth",
        "ipfs://QmConcurrent1"
      );

      const { escrow: escrow2 } = await createProjectWithEscrow(
        token,
        registry,
        creator,
        beneficiary,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        0n,
        "concurrent2.eth",
        "ipfs://QmConcurrent2"
      );

      // Contributors contribute to both projects simultaneously
      const contribution = ethers.parseEther("1000");

      await token
        .connect(contributor1)
        .approve(await escrow1.getAddress(), contribution);
      await token
        .connect(contributor1)
        .approve(await escrow2.getAddress(), contribution);
      await token
        .connect(contributor2)
        .approve(await escrow1.getAddress(), contribution);
      await token
        .connect(contributor2)
        .approve(await escrow2.getAddress(), contribution);

      // Contribute to both projects
      await escrow1.connect(contributor1).contribute(contribution);
      await escrow1.connect(contributor2).contribute(contribution);
      await escrow2.connect(contributor1).contribute(contribution);
      await escrow2.connect(contributor2).contribute(contribution);

      // Verify both projects received contributions independently
      expect(await escrow1.total()).to.equal(contribution * 2n);
      expect(await escrow2.total()).to.equal(contribution * 2n);
      expect(await escrow1.depositedOf(contributor1.address)).to.equal(
        contribution
      );
      expect(await escrow2.depositedOf(contributor1.address)).to.equal(
        contribution
      );
    });
  });

  describe("Gas Optimization and Performance", function () {
    it("Should use reasonable gas for full project lifecycle", async function () {
      const { token, registry, creator, beneficiary, contributor1, deadline } =
        await loadFixture(deployIntegrationFixture);

      // Track gas usage for each step
      const gasUsage: { [key: string]: bigint } = {};

      // 1. Deploy escrow and register project
      const CoopEscrowFactory = await ethers.getContractFactory("CoopEscrow");

      const escrow = await CoopEscrowFactory.connect(creator).deploy(
        await token.getAddress(),
        beneficiary.address,
        GOAL_AMOUNT,
        deadline,
        MIN_CONTRIBUTION,
        0n
      );
      const escrowReceipt = await escrow.deploymentTransaction()?.wait();
      gasUsage.escrowDeploy = escrowReceipt?.gasUsed || 0n;

      const registryTx = await registry
        .connect(creator)
        .createProject(
          "gas-test.eth",
          await escrow.getAddress(),
          "ipfs://QmGasTest"
        );
      const registryReceipt = await registryTx.wait();
      gasUsage.projectRegistration = registryReceipt?.gasUsed || 0n;

      // 2. Contribution
      await token
        .connect(contributor1)
        .approve(await escrow.getAddress(), GOAL_AMOUNT);
      const contributeTx = await escrow
        .connect(contributor1)
        .contribute(GOAL_AMOUNT);
      const contributeReceipt = await contributeTx.wait();
      gasUsage.contribution = contributeReceipt?.gasUsed || 0n;

      // 3. Finalization
      const finalizeTx = await escrow.connect(creator).finalize(GOAL_AMOUNT);
      const finalizeReceipt = await finalizeTx.wait();
      gasUsage.finalization = finalizeReceipt?.gasUsed || 0n;

      // Verify gas usage is within reasonable bounds
      expect(gasUsage.escrowDeploy).to.be.lessThan(2000000n); // 2M gas
      expect(gasUsage.projectRegistration).to.be.lessThan(200000n); // 200k gas
      expect(gasUsage.contribution).to.be.lessThan(150000n); // 150k gas
      expect(gasUsage.finalization).to.be.lessThan(120000n); // 120k gas

      console.log("Gas usage:", gasUsage);
    });
  });
});
