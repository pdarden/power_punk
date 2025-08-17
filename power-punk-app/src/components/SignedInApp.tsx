'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Campaign, ProjectData } from '@/types';
import ProjectCard from '@/components/projects/ProjectCard';
import WalletHeader from '@/components/wallet/WalletHeader';
import { Button } from '@/components/ui/button';
import ProjectTypeDropdown from '@/components/ui/ProjectTypeDropdown';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { MapIcon, ListIcon, Plus } from 'lucide-react';
import Link from 'next/link';

// Dynamic import for map to avoid SSR issues
const ProjectMap = dynamic(() => import('@/components/map/ProjectMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-gray-100 animate-pulse rounded-lg" />
});

// Mock data for demonstration
const mockProjects: Campaign[] = [
  {
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
  {
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
  {
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
];

const mockProjectData: Record<string, ProjectData> = {
  'walrus_1': {
    projectTitle: 'Sunset District Solar Grid',
    description: 'Community solar microgrid serving 100 homes in San Francisco',
    initialUnitCost: 1000,
    goalAmount: 100000,
    contributors: [
      { walletAddress: '0x123...', units: 10, totalAmountPaid: 10000, timestamp: '2024-01-01' },
      { walletAddress: '0x456...', units: 5, totalAmountPaid: 5000, timestamp: '2024-01-02' },
    ],
    timeline: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      milestones: [],
    },
    referrals: [],
  },
  'walrus_2': {
    projectTitle: 'Austin Battery Storage',
    description: 'Large-scale battery storage for renewable energy in Austin',
    initialUnitCost: 5000,
    goalAmount: 500000,
    contributors: [
      { walletAddress: '0x789...', units: 20, totalAmountPaid: 100000, timestamp: '2024-01-02' },
    ],
    timeline: {
      startDate: '2024-01-02',
      endDate: '2024-06-30',
      milestones: [],
    },
    referrals: [],
  },
  'walrus_3': {
    projectTitle: 'Brooklyn Green Space',
    description: 'Converting vacant lot into community park with solar lighting',
    initialUnitCost: 500,
    goalAmount: 50000,
    contributors: [
      { walletAddress: '0xabc...', units: 100, totalAmountPaid: 50000, timestamp: '2024-01-03' },
    ],
    timeline: {
      startDate: '2024-01-03',
      endDate: '2024-03-31',
      milestones: [],
    },
    referrals: [],
  },
};

// Dropdown options
const LOCATION_OPTIONS = [
  { value: 'usa', label: 'USA' },
  { value: 'canada', label: 'Canada' },
  { value: 'mexico', label: 'Mexico' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'funded', label: 'Funded' },
  { value: 'completed', label: 'Completed' },
];

export default function SignedInApp() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [projects, setProjects] = useState<Campaign[]>([]);
  const [projectData, setProjectData] = useState<Record<string, ProjectData>>({});
  const [selectedProject, setSelectedProject] = useState<Campaign | null>(null);
  const [filters, setFilters] = useState({
    projectType: '',
    location: '',
    status: '',
  });

  useEffect(() => {
    // Load projects (would fetch from Supabase in production)
    setProjects(mockProjects);
    setProjectData(mockProjectData);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/powerpunk.png" 
                alt="Power Punk" 
                className="w-10 h-10 mr-3 rounded-lg"
              />
              <h1 className="text-2xl font-bold text-gray-900">Power Punk</h1>
              <span className="ml-3 text-sm text-gray-500">
                Grassroots Climate Solutions
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/projects/create">
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project
                </Button>
              </Link>
              <Link href="/dashboard">
                <button className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  Dashboard
                </button>
              </Link>
              <WalletHeader />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Active Projects</h2>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'map' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ListIcon className="w-4 h-4" />
              List
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="min-w-[200px]">
            <ProjectTypeDropdown
              value={filters.projectType}
              onChange={(value) => setFilters({ ...filters, projectType: value })}
              placeholder="All Project Types"
            />
          </div>
          
          <div className="min-w-[150px]">
            <CustomDropdown
              value={filters.location}
              onChange={(value) => setFilters({ ...filters, location: value })}
              options={LOCATION_OPTIONS}
              placeholder="All Locations"
            />
          </div>
          
          <div className="min-w-[120px]">
            <CustomDropdown
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={STATUS_OPTIONS}
              placeholder="All Status"
            />
          </div>
        </div>

        {/* Content */}
        {viewMode === 'map' ? (
          <div className="relative h-[500px] bg-white rounded-lg shadow-md p-4">
            <ProjectMap 
              projects={projects}
              onProjectClick={(project) => setSelectedProject(project)}
            />
            {/* Selected Project Card (for map clicks) */}
            {selectedProject && (
              <div className="absolute top-1/2 right-4 max-w-sm w-full transform -translate-y-1/2" style={{ zIndex: 9999 }}>
                <div className="relative">
                  <button
                    className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors z-10"
                    onClick={() => setSelectedProject(null)}
                  >
                    <span className="text-gray-600 text-lg font-medium">×</span>
                  </button>
                  <ProjectCard
                    campaign={selectedProject}
                    projectData={projectData[selectedProject.walrus_id]}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                campaign={project}
                projectData={projectData[project.walrus_id]}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}