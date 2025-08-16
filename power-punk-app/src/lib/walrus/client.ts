import { ProjectData } from '@/types';

const WALRUS_API_URL = process.env.WALRUS_API_URL || 'https://api.walrus.xyz';
const WALRUS_API_KEY = process.env.WALRUS_API_KEY;

export class WalrusClient {
  private apiUrl: string;
  private apiKey?: string;

  constructor() {
    this.apiUrl = WALRUS_API_URL;
    this.apiKey = WALRUS_API_KEY;
  }

  async storeProjectData(data: ProjectData): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to store data: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id; // Walrus ID
    } catch (error) {
      console.error('Error storing data in Walrus:', error);
      throw error;
    }
  }

  async getProjectData(walrusId: string): Promise<ProjectData> {
    try {
      const response = await fetch(`${this.apiUrl}/retrieve/${walrusId}`, {
        headers: {
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve data: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ProjectData;
    } catch (error) {
      console.error('Error retrieving data from Walrus:', error);
      throw error;
    }
  }

  async updateProjectData(walrusId: string, updates: Partial<ProjectData>): Promise<string> {
    try {
      // Get existing data
      const existingData = await this.getProjectData(walrusId);
      
      // Merge with updates
      const updatedData: ProjectData = {
        ...existingData,
        ...updates,
        contributors: updates.contributors || existingData.contributors,
        referrals: updates.referrals || existingData.referrals,
      };

      // Store new version
      return await this.storeProjectData(updatedData);
    } catch (error) {
      console.error('Error updating data in Walrus:', error);
      throw error;
    }
  }

  async addContributor(
    walrusId: string, 
    contributor: ProjectData['contributors'][0]
  ): Promise<string> {
    const projectData = await this.getProjectData(walrusId);
    
    // Check if contributor already exists
    const existingIndex = projectData.contributors.findIndex(
      c => c.walletAddress === contributor.walletAddress
    );

    if (existingIndex >= 0) {
      // Update existing contributor
      projectData.contributors[existingIndex] = {
        ...projectData.contributors[existingIndex],
        units: projectData.contributors[existingIndex].units + contributor.units,
        totalAmountPaid: projectData.contributors[existingIndex].totalAmountPaid + contributor.totalAmountPaid,
        timestamp: contributor.timestamp,
      };
    } else {
      // Add new contributor
      projectData.contributors.push(contributor);
    }

    return await this.storeProjectData(projectData);
  }

  async addReferral(
    walrusId: string,
    referrerWallet: string,
    referredWallet: string
  ): Promise<string> {
    const projectData = await this.getProjectData(walrusId);
    
    // Find existing referral entry
    const existingReferral = projectData.referrals.find(
      r => r.referrerWallet === referrerWallet
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

    return await this.storeProjectData(projectData);
  }
}

export const walrusClient = new WalrusClient();