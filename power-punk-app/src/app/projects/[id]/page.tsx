'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Target, Clock, Trophy, TrendingUp } from 'lucide-react';
import { Campaign, ProjectData } from '@/types';
import { formatCurrency } from '@/lib/utils/pricing';
import ContributeToProject from '@/components/wallet/ContributeToProject';
import ProjectTypeIcon, { getProjectTypeLabel, getProjectTypeColor } from '@/components/ui/ProjectTypeIcon';
import Providers from '@/components/providers/Providers';

// Mock data - in production this would come from Supabase/Walrus
const mockProjectData: Record<string, { campaign: Campaign; data: ProjectData }> = {
  '1': {
    campaign: {
      id: '1',
      walrus_id: 'walrus_1',
      owner_id: 'user_1',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      location: {
        country: 'USA',
        region: 'California',
        coordinates: { lat: 37.7749, lng: -122.4194 },
      },
      project_type: 'solar_microgrid',
    },
    data: {
      projectTitle: 'Sunset District Solar Grid',
      description: 'Community solar microgrid serving 100 homes in San Francisco. This project will install rooftop solar panels and battery storage systems to create a resilient, renewable energy microgrid for the Sunset District neighborhood.',
      initialUnitCost: 1000,
      goalAmount: 100000,
      contributors: [
        { walletAddress: '0x1234...5678', units: 10, totalAmountPaid: 10000, timestamp: '2024-01-01' },
        { walletAddress: '0x4567...890a', units: 5, totalAmountPaid: 5000, timestamp: '2024-01-02' },
        { walletAddress: '0x7890...bcde', units: 3, totalAmountPaid: 3000, timestamp: '2024-01-03' },
      ],
      timeline: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        milestones: [],
      },
      referrals: [
        { referrerWallet: '0x1234...5678', referredWallets: ['0x4567...890a', '0x7890...bcde'], rewards: 500 },
      ],
    },
  },
  '2': {
    campaign: {
      id: '2',
      walrus_id: 'walrus_2',
      owner_id: 'user_2',
      status: 'active',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
      location: {
        country: 'USA',
        region: 'Texas',
        coordinates: { lat: 30.2672, lng: -97.7431 },
      },
      project_type: 'batteries',
    },
    data: {
      projectTitle: 'Austin Battery Storage',
      description: 'Large-scale battery storage for renewable energy in Austin. This facility will store excess renewable energy during peak production and release it during high demand periods.',
      initialUnitCost: 5000,
      goalAmount: 500000,
      contributors: [
        { walletAddress: '0x7890...1234', units: 20, totalAmountPaid: 100000, timestamp: '2024-01-02' },
        { walletAddress: '0xabcd...efgh', units: 10, totalAmountPaid: 50000, timestamp: '2024-01-03' },
      ],
      timeline: {
        startDate: '2024-01-02',
        endDate: '2024-06-30',
        milestones: [],
      },
      referrals: [],
    },
  },
  '3': {
    campaign: {
      id: '3',
      walrus_id: 'walrus_3',
      owner_id: 'user_3',
      status: 'funded',
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
      location: {
        country: 'USA',
        region: 'New York',
        coordinates: { lat: 40.7128, lng: -74.0060 },
      },
      project_type: 'community_park',
    },
    data: {
      projectTitle: 'Brooklyn Green Space',
      description: 'Converting vacant lot into community park with solar lighting. This project will transform an abandoned lot into a vibrant community gathering space with sustainable features.',
      initialUnitCost: 500,
      goalAmount: 50000,
      contributors: [
        { walletAddress: '0xabc1...2345', units: 100, totalAmountPaid: 50000, timestamp: '2024-01-03' },
      ],
      timeline: {
        startDate: '2024-01-03',
        endDate: '2024-03-31',
        milestones: [],
      },
      referrals: [],
    },
  },
};

function ProjectDetailContent() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<{ campaign: Campaign; data: ProjectData } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading project data
    setTimeout(() => {
      const projectInfo = mockProjectData[projectId];
      setProject(projectInfo || null);
      setLoading(false);
    }, 500);
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-6">The project you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Back to Projects
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const { campaign, data } = project;
  const totalRaised = data.contributors.reduce((sum, c) => sum + c.totalAmountPaid, 0);
  const progress = (totalRaised / data.goalAmount) * 100;
  const daysLeft = Math.max(0, Math.ceil((new Date(data.timeline.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // Sort contributors by amount for leaderboard
  const leaderboard = [...data.contributors].sort((a, b) => b.totalAmountPaid - a.totalAmountPaid);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Projects
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Details - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.projectTitle}</h1>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
                      <ProjectTypeIcon 
                        type={campaign.project_type} 
                        className={`w-4 h-4 ${getProjectTypeColor(campaign.project_type)}`} 
                      />
                      {getProjectTypeLabel(campaign.project_type)}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      campaign.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      campaign.status === 'funded' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-6">{data.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2" />
                  {campaign.location.region}, {campaign.location.country}
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="w-4 h-4 mr-2" />
                  {data.contributors.length} contributors
                </div>
                <div className="flex items-center text-gray-700">
                  <Target className="w-4 h-4 mr-2" />
                  Goal: {formatCurrency(data.goalAmount)}
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="w-4 h-4 mr-2" />
                  {daysLeft} days left
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Funding Progress</h2>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Raised</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totalRaised)} / {formatCurrency(data.goalAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-700">Progress</span>
                  <span className="font-medium text-gray-900">{progress.toFixed(1)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{data.contributors.length}</p>
                  <p className="text-sm text-gray-700">Contributors</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.initialUnitCost)}</p>
                  <p className="text-sm text-gray-700">Per Unit</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{daysLeft}</p>
                  <p className="text-sm text-gray-700">Days Left</p>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                <h2 className="text-xl font-bold text-gray-900">Top Contributors</h2>
              </div>
              
              <div className="space-y-3">
                {leaderboard.map((contributor, index) => (
                  <div key={contributor.walletAddress} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 
                        'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contributor.walletAddress}</p>
                        <p className="text-xs text-gray-700">{contributor.units} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(contributor.totalAmountPaid)}</p>
                      <p className="text-xs text-gray-700">{(contributor.totalAmountPaid / totalRaised * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral Rewards */}
            {data.referrals.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                  <h2 className="text-xl font-bold text-gray-900">Referral Network</h2>
                </div>
                
                <div className="space-y-3">
                  {data.referrals.map((referral, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{referral.referrerWallet}</span>
                        {referral.rewards && (
                          <span className="text-sm font-bold text-green-600">+{formatCurrency(referral.rewards)} rewards</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        Referred {referral.referredWallets.length} {referral.referredWallets.length === 1 ? 'person' : 'people'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contribution Widget - Right Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ContributeToProject
                projectId={campaign.id}
                projectWalletAddress="0x1234567890123456789012345678901234567890"
                unitPrice={data.initialUnitCost}
                onSuccess={(txHash) => {
                  console.log('Contribution successful:', txHash);
                  // Refresh project data
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Providers>
      <ProjectDetailContent />
    </Providers>
  );
}