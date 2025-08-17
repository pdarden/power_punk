"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import { Campaign, ProjectData } from "@/types";
import ProjectCard from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Wallet, TrendingUp, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils/pricing";
import Providers from "@/components/providers/Providers";

// Mock data for demonstration
const mockUserProjects: Campaign[] = [
  {
    id: "1",
    walrus_id: "walrus_1",
    owner_id: "current_user",
    status: "active",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    location: {
      country: "USA",
      region: "California",
      coordinates: { lat: 37.7749, lng: -122.4194 },
    },
    project_type: "solar_microgrid",
  },
];

const mockFundedProjects: Campaign[] = [
  {
    id: "2",
    walrus_id: "walrus_2",
    owner_id: "user_2",
    status: "active",
    created_at: "2024-01-02",
    updated_at: "2024-01-02",
    location: {
      country: "USA",
      region: "Texas",
      coordinates: { lat: 30.2672, lng: -97.7431 },
    },
    project_type: "batteries",
  },
];

const mockProjectData: Record<string, ProjectData> = {
  walrus_1: {
    projectTitle: "Sunset District Solar Grid",
    description: "Community solar microgrid serving 100 homes",
    initialUnitCost: 1000,
    goalAmount: 100000,
    contributors: [
      {
        walletAddress: "0x123...",
        units: 10,
        totalAmountPaid: 10000,
        timestamp: "2024-01-01",
      },
      {
        walletAddress: "0x456...",
        units: 5,
        totalAmountPaid: 5000,
        timestamp: "2024-01-02",
      },
    ],
    timeline: {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      milestones: [],
    },
    referrals: [
      { referrerWallet: "0x123...", referredWallets: ["0x789...", "0xabc..."] },
    ],
  },
  walrus_2: {
    projectTitle: "Austin Battery Storage",
    description: "Large-scale battery storage for renewable energy",
    initialUnitCost: 5000,
    goalAmount: 500000,
    contributors: [
      {
        walletAddress: "current_user",
        units: 20,
        totalAmountPaid: 100000,
        timestamp: "2024-01-02",
      },
    ],
    timeline: {
      startDate: "2024-01-02",
      endDate: "2024-06-30",
      milestones: [],
    },
    referrals: [],
  },
};

function DashboardContent() {
  const { evmAddress } = useEvmAddress();
  const [activeTab, setActiveTab] = useState<"created" | "funded">("created");
  const [userProjects, setUserProjects] = useState<Campaign[]>([]);
  const [fundedProjects, setFundedProjects] = useState<Campaign[]>([]);
  const [projectData, setProjectData] = useState<Record<string, ProjectData>>(
    {},
  );

  useEffect(() => {
    // Load user's projects (would fetch from API in production)
    setUserProjects(mockUserProjects);
    setFundedProjects(mockFundedProjects);

    // Update mock data to include actual wallet address
    if (evmAddress) {
      const updatedProjectData = {
        ...mockProjectData,
        walrus_2: {
          ...mockProjectData.walrus_2,
          contributors: [
            {
              walletAddress: evmAddress,
              units: 20,
              totalAmountPaid: 100000,
              timestamp: "2024-01-02",
            },
          ],
        },
      };
      setProjectData(updatedProjectData);
    } else {
      setProjectData(mockProjectData);
    }
  }, [evmAddress]);

  const calculateTotalFunded = () => {
    return Object.values(projectData).reduce((total, data) => {
      const userContributions = data.contributors.filter(
        (c) =>
          evmAddress &&
          c.walletAddress.toLowerCase() === evmAddress.toLowerCase(),
      );
      return (
        total + userContributions.reduce((sum, c) => sum + c.totalAmountPaid, 0)
      );
    }, 0);
  };

  const calculateTotalReferrals = () => {
    return Object.values(projectData).reduce((total, data) => {
      const userReferrals = data.referrals.filter(
        (r) =>
          evmAddress &&
          r.referrerWallet.toLowerCase() === evmAddress.toLowerCase(),
      );
      return (
        total +
        userReferrals.reduce((sum, r) => sum + r.referredWallets.length, 0)
      );
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </div>

            <Link href="/projects/create">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Total Funded</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculateTotalFunded())}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Projects Created</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userProjects.length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Total Referrals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateTotalReferrals()}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                className={`px-6 py-3 font-medium ${
                  activeTab === "created"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("created")}
              >
                My Projects ({userProjects.length})
              </button>
              <button
                className={`px-6 py-3 font-medium ${
                  activeTab === "funded"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("funded")}
              >
                Funded Projects ({fundedProjects.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "created" ? (
              userProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userProjects.map((project) => (
                    <div key={project.id}>
                      <ProjectCard
                        campaign={project}
                        projectData={projectData[project.walrus_id]}
                      />
                      {/* Project Management Actions */}
                      <div className="mt-2 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          View Analytics
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-700 mb-4">
                    You haven&apos;t created any projects yet
                  </p>
                  <Link href="/projects/create">
                    <Button>Create Your First Project</Button>
                  </Link>
                </div>
              )
            ) : fundedProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fundedProjects.map((project) => {
                  const data = projectData[project.walrus_id];
                  const userContribution = data?.contributors.find(
                    (c) =>
                      evmAddress &&
                      c.walletAddress.toLowerCase() ===
                        evmAddress.toLowerCase(),
                  );

                  return (
                    <div key={project.id}>
                      <ProjectCard campaign={project} projectData={data} />
                      {/* Contribution Info */}
                      {userContribution && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <p className="text-blue-700">
                            Your contribution:{" "}
                            {formatCurrency(userContribution.totalAmountPaid)}
                          </p>
                          <p className="text-blue-600">
                            Units: {userContribution.units}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-700 mb-4">
                  You haven&apos;t funded any projects yet
                </p>
                <Link href="/">
                  <Button>Explore Projects</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Referral Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Referral Program
          </h2>
          <p className="text-gray-700 mb-4">
            Share your referral link to earn rewards when others contribute to
            projects
          </p>
          <div className="flex gap-4">
            <input
              type="text"
              readOnly
              value="https://powerpunk.xyz/ref/your_wallet_address"
              className="flex-1 px-3 py-2 border border-gray-900 rounded-lg bg-gray-50 text-gray-900"
            />
            <Button>Copy Link</Button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  );
}
