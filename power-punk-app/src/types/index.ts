// User types
export interface User {
  id: string;
  username: string;
  wallet_id: string;
  location: {
    country: string;
    region: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  email?: string;
  created_at: string;
}

// Campaign/Project types
export interface Campaign {
  id: string;
  walrus_id: string;
  owner_id: string;
  status: 'draft' | 'active' | 'funded' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  location: {
    country: string;
    region: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  project_type: ProjectType;
}

export type ProjectType = 
  | 'solar_microgrid'
  | 'batteries'
  | 'community_park'
  | 'hvac_system'
  | 'tree_planting'
  | 'electrification'
  | 'bitcoin_mining'
  | 'gpu_infrastructure';

// Walrus stored project data
export interface ProjectData {
  projectTitle: string;
  description: string;
  initialUnitCost: number;
  goalAmount: number;
  contributors: Contributor[];
  timeline: Timeline;
  referrals: Referral[];
  costCurve?: CostCurve;
  images?: string[];
}

export interface Contributor {
  walletAddress: string;
  units: number;
  totalAmountPaid: number;
  timestamp: string;
}

export interface Timeline {
  startDate: string;
  endDate: string;
  milestones: Milestone[];
}

export interface Milestone {
  date: string;
  description: string;
  completed: boolean;
}

export interface Referral {
  referrerWallet: string;
  referredWallets: string[];
  rewards?: number;
}

export interface CostCurve {
  baseUnits: number;
  baseCost: number;
  discountPercentage: number;
  discountThreshold: number;
}

// Payment types
export interface Payment {
  id: string;
  campaign_id: string;
  from_wallet: string;
  to_wallet: string;
  amount: number;
  units: number;
  status: 'pending' | 'completed' | 'failed';
  transaction_hash?: string;
  created_at: string;
}

// Agent wallet types
export interface ProjectWallet {
  campaign_id: string;
  wallet_address: string;
  agent_id: string;
  created_at: string;
}