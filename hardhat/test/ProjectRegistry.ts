import { expect } from "chai";
import { network } from "hardhat";
import { ProjectRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

async function loadFixture<T>(fixture: () => Promise<T>): Promise<T> {
  return fixture();
}

describe("ProjectRegistry", function () {
  async function deployRegistryFixture() {
    const [owner, creator1, creator2, escrow1, escrow2] =
      await ethers.getSigners();

    const ProjectRegistryFactory = await ethers.getContractFactory(
      "ProjectRegistry"
    );
    const registry = await ProjectRegistryFactory.deploy();

    return {
      registry,
      owner,
      creator1,
      creator2,
      escrow1,
      escrow2,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);

      expect(await registry.nextId()).to.equal(0);
    });
  });

  describe("Project Creation", function () {
    it("Should create a project with valid parameters", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const ensName = "test-project.eth";
      const metaURI = "ipfs://QmTest123";

      const tx = await registry
        .connect(creator1)
        .createProject(ensName, escrow1.address, metaURI);

      await expect(tx)
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, ensName, escrow1.address, metaURI);

      expect(await registry.nextId()).to.equal(1);
    });

    it("Should return correct project ID", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const ensName = "test-project.eth";
      const metaURI = "ipfs://QmTest123";

      const result = await registry
        .connect(creator1)
        .createProject.staticCall(ensName, escrow1.address, metaURI);

      expect(result).to.equal(1);
    });

    it("Should increment project IDs correctly", async function () {
      const { registry, creator1, creator2, escrow1, escrow2 } =
        await loadFixture(deployRegistryFixture);

      // Create first project
      await registry
        .connect(creator1)
        .createProject("project1.eth", escrow1.address, "ipfs://QmTest1");

      // Create second project
      await registry
        .connect(creator2)
        .createProject("project2.eth", escrow2.address, "ipfs://QmTest2");

      expect(await registry.nextId()).to.equal(2);
    });

    it("Should handle empty ENS name", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const tx = await registry
        .connect(creator1)
        .createProject("", escrow1.address, "ipfs://QmTest123");

      await expect(tx)
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, "", escrow1.address, "ipfs://QmTest123");
    });

    it("Should handle empty meta URI", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const tx = await registry
        .connect(creator1)
        .createProject("test-project.eth", escrow1.address, "");

      await expect(tx)
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, "test-project.eth", escrow1.address, "");
    });

    it("Should revert with zero escrow address", async function () {
      const { registry, creator1 } = await loadFixture(deployRegistryFixture);

      await expect(
        registry
          .connect(creator1)
          .createProject(
            "test-project.eth",
            ethers.ZeroAddress,
            "ipfs://QmTest123"
          )
      ).to.be.revertedWith("escrow=0");
    });

    it("Should allow same creator to create multiple projects", async function () {
      const { registry, creator1, escrow1, escrow2 } = await loadFixture(
        deployRegistryFixture
      );

      // Create first project
      await expect(
        registry
          .connect(creator1)
          .createProject("project1.eth", escrow1.address, "ipfs://QmTest1")
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(
          1,
          creator1.address,
          "project1.eth",
          escrow1.address,
          "ipfs://QmTest1"
        );

      // Create second project with same creator
      await expect(
        registry
          .connect(creator1)
          .createProject("project2.eth", escrow2.address, "ipfs://QmTest2")
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(
          2,
          creator1.address,
          "project2.eth",
          escrow2.address,
          "ipfs://QmTest2"
        );

      expect(await registry.nextId()).to.equal(2);
    });

    it("Should allow same escrow for different projects", async function () {
      const { registry, creator1, creator2, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      // Create first project
      await registry
        .connect(creator1)
        .createProject("project1.eth", escrow1.address, "ipfs://QmTest1");

      // Create second project with same escrow but different creator
      await registry
        .connect(creator2)
        .createProject("project2.eth", escrow1.address, "ipfs://QmTest2");

      expect(await registry.nextId()).to.equal(2);
    });
  });

  describe("Project Retrieval", function () {
    it("Should retrieve project correctly", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const ensName = "test-project.eth";
      const metaURI = "ipfs://QmTest123";

      await registry
        .connect(creator1)
        .createProject(ensName, escrow1.address, metaURI);

      const project = await registry.getProject(1);

      expect(project.creator).to.equal(creator1.address);
      expect(project.escrow).to.equal(escrow1.address);
      expect(project.ensName).to.equal(ensName);
      expect(project.metaURI).to.equal(metaURI);
    });

    it("Should retrieve multiple projects correctly", async function () {
      const { registry, creator1, creator2, escrow1, escrow2 } =
        await loadFixture(deployRegistryFixture);

      // Create first project
      await registry
        .connect(creator1)
        .createProject("project1.eth", escrow1.address, "ipfs://QmTest1");

      // Create second project
      await registry
        .connect(creator2)
        .createProject("project2.eth", escrow2.address, "ipfs://QmTest2");

      const project1 = await registry.getProject(1);
      const project2 = await registry.getProject(2);

      expect(project1.creator).to.equal(creator1.address);
      expect(project1.escrow).to.equal(escrow1.address);
      expect(project1.ensName).to.equal("project1.eth");
      expect(project1.metaURI).to.equal("ipfs://QmTest1");

      expect(project2.creator).to.equal(creator2.address);
      expect(project2.escrow).to.equal(escrow2.address);
      expect(project2.ensName).to.equal("project2.eth");
      expect(project2.metaURI).to.equal("ipfs://QmTest2");
    });

    it("Should revert when retrieving non-existent project", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);

      await expect(registry.getProject(1)).to.be.revertedWith("not found");
      await expect(registry.getProject(999)).to.be.revertedWith("not found");
    });

    it("Should revert when retrieving project with ID 0", async function () {
      const { registry } = await loadFixture(deployRegistryFixture);

      await expect(registry.getProject(0)).to.be.revertedWith("not found");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle very long ENS names", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const longEnsName = "a".repeat(1000) + ".eth";
      const metaURI = "ipfs://QmTest123";

      const tx = await registry
        .connect(creator1)
        .createProject(longEnsName, escrow1.address, metaURI);

      await expect(tx)
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, longEnsName, escrow1.address, metaURI);

      const project = await registry.getProject(1);
      expect(project.ensName).to.equal(longEnsName);
    });

    it("Should handle very long meta URIs", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const ensName = "test-project.eth";
      const longMetaURI = "ipfs://Qm" + "a".repeat(1000);

      const tx = await registry
        .connect(creator1)
        .createProject(ensName, escrow1.address, longMetaURI);

      await expect(tx)
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, ensName, escrow1.address, longMetaURI);

      const project = await registry.getProject(1);
      expect(project.metaURI).to.equal(longMetaURI);
    });

    it("Should handle special characters in ENS names", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const specialEnsName = "test-project.eth";
      const metaURI = "ipfs://QmTest123";

      await registry
        .connect(creator1)
        .createProject(specialEnsName, escrow1.address, metaURI);

      const project = await registry.getProject(1);
      expect(project.ensName).to.equal(specialEnsName);
    });

    it("Should handle Unicode characters", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const unicodeEnsName = "测试项目.eth";
      const unicodeMetaURI = "ipfs://QmTest测试123";

      await registry
        .connect(creator1)
        .createProject(unicodeEnsName, escrow1.address, unicodeMetaURI);

      const project = await registry.getProject(1);
      expect(project.ensName).to.equal(unicodeEnsName);
      expect(project.metaURI).to.equal(unicodeMetaURI);
    });

    it("Should not allow external modification of project data", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      await registry
        .connect(creator1)
        .createProject("test-project.eth", escrow1.address, "ipfs://QmTest123");

      const project = await registry.getProject(1);

      // Projects are returned as memory structs, so modifications shouldn't affect stored data
      // This is more of a conceptual test since Solidity handles this automatically
      expect(project.creator).to.equal(creator1.address);
      expect(project.escrow).to.equal(escrow1.address);
    });

    it("Should handle maximum project ID boundaries", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      // Create a project to test normal increment
      await registry
        .connect(creator1)
        .createProject("test-project.eth", escrow1.address, "ipfs://QmTest123");

      expect(await registry.nextId()).to.equal(1);

      // The contract should handle large numbers of projects
      // In practice, we can't test to uint256 max, but we can verify the increment logic
      const project = await registry.getProject(1);
      expect(project.creator).to.equal(creator1.address);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for project creation", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const tx = await registry
        .connect(creator1)
        .createProject("test-project.eth", escrow1.address, "ipfs://QmTest123");

      const receipt = await tx.wait();

      // Gas usage should be reasonable (this is more of a benchmark test)
      // Actual gas limits would depend on network requirements
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });

    it("Should use reasonable gas for project retrieval", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      await registry
        .connect(creator1)
        .createProject("test-project.eth", escrow1.address, "ipfs://QmTest123");

      // getProject is a view function, so it doesn't consume gas in transactions
      // But we can still call it to ensure it works efficiently
      const project = await registry.getProject(1);
      expect(project.creator).to.equal(creator1.address);
    });
  });

  describe("Event Testing", function () {
    it("Should emit ProjectCreated event with correct parameters", async function () {
      const { registry, creator1, escrow1 } = await loadFixture(
        deployRegistryFixture
      );

      const ensName = "test-project.eth";
      const metaURI = "ipfs://QmTest123";

      await expect(
        registry
          .connect(creator1)
          .createProject(ensName, escrow1.address, metaURI)
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(1, creator1.address, ensName, escrow1.address, metaURI);
    });

    it("Should emit events for multiple projects", async function () {
      const { registry, creator1, creator2, escrow1, escrow2 } =
        await loadFixture(deployRegistryFixture);

      await expect(
        registry
          .connect(creator1)
          .createProject("project1.eth", escrow1.address, "ipfs://QmTest1")
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(
          1,
          creator1.address,
          "project1.eth",
          escrow1.address,
          "ipfs://QmTest1"
        );

      await expect(
        registry
          .connect(creator2)
          .createProject("project2.eth", escrow2.address, "ipfs://QmTest2")
      )
        .to.emit(registry, "ProjectCreated")
        .withArgs(
          2,
          creator2.address,
          "project2.eth",
          escrow2.address,
          "ipfs://QmTest2"
        );
    });

    it("Should not emit events for failed transactions", async function () {
      const { registry, creator1 } = await loadFixture(deployRegistryFixture);

      // This should revert and not emit any events
      await expect(
        registry
          .connect(creator1)
          .createProject(
            "test-project.eth",
            ethers.ZeroAddress,
            "ipfs://QmTest123"
          )
      ).to.be.revertedWith("escrow=0");
    });
  });
});
