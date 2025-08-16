'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProjectType, ProjectData, Campaign } from '@/types';
import { walrusClient } from '@/lib/walrus/client';
import { createProjectAgent } from '@/lib/coinbase/agentkit';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    projectTitle: '',
    description: '',
    projectType: 'solar_microgrid' as ProjectType,
    location: {
      country: '',
      region: '',
      lat: '',
      lng: '',
    },
    initialUnitCost: '',
    goalAmount: '',
    startDate: '',
    endDate: '',
    milestones: [] as { date: string; description: string }[],
    costCurve: {
      enabled: false,
      baseUnits: 10,
      discountPercentage: 5,
      discountThreshold: 10,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create project data for Walrus
      const projectData: ProjectData = {
        projectTitle: formData.projectTitle,
        description: formData.description,
        initialUnitCost: parseFloat(formData.initialUnitCost),
        goalAmount: parseFloat(formData.goalAmount),
        contributors: [],
        timeline: {
          startDate: formData.startDate,
          endDate: formData.endDate,
          milestones: formData.milestones.map(m => ({ ...m, completed: false })),
        },
        referrals: [],
        costCurve: formData.costCurve.enabled ? {
          baseUnits: formData.costCurve.baseUnits,
          baseCost: parseFloat(formData.initialUnitCost),
          discountPercentage: formData.costCurve.discountPercentage,
          discountThreshold: formData.costCurve.discountThreshold,
        } : undefined,
      };

      // Store in Walrus
      const walrusId = await walrusClient.storeProjectData(projectData);

      // Create project agent and wallet
      const projectId = `project_${Date.now()}`;
      const { walletAddress } = await createProjectAgent(projectId);

      // Here you would save to Supabase
      console.log('Project created:', {
        walrusId,
        projectId,
        walletAddress,
      });

      // Redirect to project page
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { date: '', description: '' }],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Create New Project</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value as ProjectType })}
                >
                  <option value="solar_microgrid">Solar Microgrid</option>
                  <option value="batteries">Batteries</option>
                  <option value="community_park">Community Park</option>
                  <option value="hvac_system">HVAC System</option>
                  <option value="tree_planting">Tree Planting</option>
                  <option value="electrification">Electrification</option>
                  <option value="bitcoin_mining">Bitcoin Mining</option>
                  <option value="gpu_infrastructure">GPU Infrastructure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.location.country}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, country: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Region/State</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.location.region}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, region: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.location.lat}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, lat: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.location.lng}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, lng: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Funding */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Funding Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.initialUnitCost}
                  onChange={(e) => setFormData({ ...formData, initialUnitCost: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Goal Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.goalAmount}
                  onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={formData.costCurve.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    costCurve: { ...formData.costCurve, enabled: e.target.checked }
                  })}
                />
                Enable dynamic pricing (volume discounts)
              </label>
              
              {formData.costCurve.enabled && (
                <div className="mt-3 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Units</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.costCurve.baseUnits}
                      onChange={(e) => setFormData({
                        ...formData,
                        costCurve: { ...formData.costCurve, baseUnits: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount %</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.costCurve.discountPercentage}
                      onChange={(e) => setFormData({
                        ...formData,
                        costCurve: { ...formData.costCurve, discountPercentage: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Threshold</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.costCurve.discountThreshold}
                      onChange={(e) => setFormData({
                        ...formData,
                        costCurve: { ...formData.costCurve, discountThreshold: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Milestones</label>
                <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                  Add Milestone
                </Button>
              </div>
              
              {formData.milestones.map((milestone, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-2">
                  <input
                    type="date"
                    placeholder="Date"
                    className="px-3 py-2 border rounded-lg"
                    value={milestone.date}
                    onChange={(e) => {
                      const newMilestones = [...formData.milestones];
                      newMilestones[index].date = e.target.value;
                      setFormData({ ...formData, milestones: newMilestones });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    className="px-3 py-2 border rounded-lg"
                    value={milestone.description}
                    onChange={(e) => {
                      const newMilestones = [...formData.milestones];
                      newMilestones[index].description = e.target.value;
                      setFormData({ ...formData, milestones: newMilestones });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}