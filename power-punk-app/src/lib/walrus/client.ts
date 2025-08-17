import { ProjectData } from "@/types";

// Mock Walrus client to replace real implementation
export class WalrusClient {
  private mockStorage: Map<string, ProjectData> = new Map();

  constructor() {
    // Initialize with some mock data if needed
  }

  async storeProjectData(data: ProjectData): Promise<string> {
    try {
      // Generate a mock Walrus ID
      const walrusId = `mock_walrus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store in mock storage
      this.mockStorage.set(walrusId, data);

      console.log(`Mock Walrus: Stored project data with ID ${walrusId}`);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return walrusId;
    } catch (error) {
      console.error("Mock Walrus: Error storing data:", error);
      throw error;
    }
  }

  async getProjectData(walrusId: string): Promise<ProjectData> {
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = this.mockStorage.get(walrusId);

      if (!data) {
        // Return mock data for unknown IDs to avoid errors
        console.warn(
          `Mock Walrus: No data found for ID ${walrusId}, returning mock data`,
        );
        return {
          projectTitle: "Mock Project",
          description: "This is mock project data",
          initialUnitCost: 100,
          goalAmount: 10000,
          contributors: [],
          timeline: {
            startDate: new Date().toISOString(),
            endDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            milestones: [],
          },
          referrals: [],
          costCurve: {
            baseUnits: 1,
            baseCost: 100,
            discountPercentage: 0,
            discountThreshold: 0,
          },
        };
      }

      console.log(`Mock Walrus: Retrieved project data for ID ${walrusId}`);
      return data;
    } catch (error) {
      console.error("Mock Walrus: Error retrieving data:", error);
      throw error;
    }
  }

  async updateProjectData(
    walrusId: string,
    updates: Partial<ProjectData>,
  ): Promise<string> {
    try {
      // Get existing data (or create mock if not found)
      let existingData: ProjectData;
      try {
        existingData = await this.getProjectData(walrusId);
      } catch {
        // If no existing data, create a basic structure
        existingData = {
          projectTitle: "Mock Project",
          description: "Mock Description",
          initialUnitCost: 100,
          goalAmount: 10000,
          contributors: [],
          timeline: {
            startDate: new Date().toISOString(),
            endDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            milestones: [],
          },
          referrals: [],
          costCurve: {
            baseUnits: 1,
            baseCost: 100,
            discountPercentage: 0,
            discountThreshold: 0,
          },
        };
      }

      // Merge with updates
      const updatedData: ProjectData = {
        ...existingData,
        ...updates,
        contributors: updates.contributors || existingData.contributors,
        referrals: updates.referrals || existingData.referrals,
      };

      // Store new version with new ID
      const newWalrusId = await this.storeProjectData(updatedData);

      console.log(
        `Mock Walrus: Updated data from ${walrusId} to ${newWalrusId}`,
      );
      return newWalrusId;
    } catch (error) {
      console.error("Mock Walrus: Error updating data:", error);
      throw error;
    }
  }

  async addContributor(
    walrusId: string,
    contributor: ProjectData["contributors"][0],
  ): Promise<string> {
    try {
      const projectData = await this.getProjectData(walrusId);

      // Check if contributor already exists
      const existingIndex = projectData.contributors.findIndex(
        (c) => c.walletAddress === contributor.walletAddress,
      );

      if (existingIndex >= 0) {
        // Update existing contributor
        projectData.contributors[existingIndex] = {
          ...projectData.contributors[existingIndex],
          units:
            projectData.contributors[existingIndex].units + contributor.units,
          totalAmountPaid:
            projectData.contributors[existingIndex].totalAmountPaid +
            contributor.totalAmountPaid,
          timestamp: contributor.timestamp,
        };
      } else {
        // Add new contributor
        projectData.contributors.push(contributor);
      }

      const newWalrusId = await this.storeProjectData(projectData);
      console.log(
        `Mock Walrus: Added contributor to ${walrusId}, new ID: ${newWalrusId}`,
      );
      return newWalrusId;
    } catch (error) {
      console.error("Mock Walrus: Error adding contributor:", error);
      throw error;
    }
  }

  async addReferral(
    walrusId: string,
    referrerWallet: string,
    referredWallet: string,
  ): Promise<string> {
    try {
      const projectData = await this.getProjectData(walrusId);

      // Find existing referral entry
      const existingReferral = projectData.referrals.find(
        (r) => r.referrerWallet === referrerWallet,
      );

      if (existingReferral) {
        // Add to existing referral list
        if (!existingReferral.referredWallets.includes(referredWallet)) {
          existingReferral.referredWallets.push(referredWallet);
        }
      } else {
        // Create new referral entry
        projectData.referrals.push({
          referrerWallet,
          referredWallets: [referredWallet],
        });
      }

      const newWalrusId = await this.storeProjectData(projectData);
      console.log(
        `Mock Walrus: Added referral to ${walrusId}, new ID: ${newWalrusId}`,
      );
      return newWalrusId;
    } catch (error) {
      console.error("Mock Walrus: Error adding referral:", error);
      throw error;
    }
  }
}

export const walrusClient = new WalrusClient();
