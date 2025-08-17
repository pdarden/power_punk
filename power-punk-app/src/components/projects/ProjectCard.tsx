'use client';

import { Campaign, ProjectData } from '@/types';
import { formatCurrency } from '@/lib/utils/pricing';
import { Button } from '@/components/ui/button';
import ProjectTypeIcon, { getProjectTypeLabel, getProjectTypeColor } from '@/components/ui/ProjectTypeIcon';
import { MapPin, Users, Target, Clock } from 'lucide-react';
import Link from 'next/link';

interface ProjectCardProps {
  campaign: Campaign;
  projectData?: ProjectData;
}

export default function ProjectCard({ campaign, projectData }: ProjectCardProps) {
  const progress = projectData 
    ? (projectData.contributors.reduce((sum, c) => sum + c.totalAmountPaid, 0) / projectData.goalAmount) * 100
    : 0;

  const contributorCount = projectData?.contributors.length || 0;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {projectData?.projectTitle || 'Loading...'}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
              <ProjectTypeIcon 
                type={campaign.project_type} 
                className={`w-3 h-3 ${getProjectTypeColor(campaign.project_type)}`} 
              />
              {getProjectTypeLabel(campaign.project_type)}
            </span>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            campaign.status === 'active' ? 'bg-blue-100 text-blue-800' :
            campaign.status === 'funded' ? 'bg-green-100 text-green-800' :
            campaign.status === 'completed' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {campaign.status}
          </span>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-2">
          {projectData?.description || 'Loading project details...'}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <MapPin className="w-4 h-4 mr-2" />
            {campaign.location.region}, {campaign.location.country}
          </div>
          
          <div className="flex items-center text-sm text-gray-700">
            <Users className="w-4 h-4 mr-2" />
            {contributorCount} contributors
          </div>

          {projectData && (
            <div className="flex items-center text-sm text-gray-700">
              <Target className="w-4 h-4 mr-2" />
              Goal: {formatCurrency(projectData.goalAmount)}
            </div>
          )}

          {projectData?.timeline && (
            <div className="flex items-center text-sm text-gray-700">
              <Clock className="w-4 h-4 mr-2" />
              Ends: {new Date(projectData.timeline.endDate).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-900 font-medium mb-1">
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <Link href={`/projects/${campaign.id}`}>
          <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold">
            View Project
          </Button>
        </Link>
      </div>
    </div>
  );
}