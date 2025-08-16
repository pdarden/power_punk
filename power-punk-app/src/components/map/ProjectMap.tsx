'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Campaign, ProjectType } from '@/types';

interface ProjectMapProps {
  projects: Campaign[];
  onProjectClick?: (project: Campaign) => void;
}

const projectTypeColors: Record<ProjectType, string> = {
  solar_microgrid: '#FFA500',
  batteries: '#00CED1',
  community_park: '#228B22',
  hvac_system: '#4169E1',
  tree_planting: '#32CD32',
  electrification: '#FFD700',
  bitcoin_mining: '#FF8C00',
  gpu_infrastructure: '#9370DB',
};

export default function ProjectMap({ projects, onProjectClick }: ProjectMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([40, -95], 4);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add project markers
    projects.forEach((project) => {
      if (project.location?.coordinates) {
        const marker = L.circleMarker(
          [project.location.coordinates.lat, project.location.coordinates.lng],
          {
            radius: 8,
            fillColor: projectTypeColors[project.project_type],
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }
        ).addTo(mapRef.current!);

        // Add popup
        marker.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${project.project_type.replace(/_/g, ' ')}</h3>
            <p class="text-sm">${project.location.region}, ${project.location.country}</p>
            <p class="text-xs text-gray-500">Status: ${project.status}</p>
          </div>
        `);

        // Add click handler
        if (onProjectClick) {
          marker.on('click', () => onProjectClick(project));
        }
      }
    });

    // Fit map to markers if projects exist
    if (projects.length > 0) {
      const group = new L.FeatureGroup();
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          group.addLayer(layer);
        }
      });
      if (group.getLayers().length > 0) {
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [projects, onProjectClick]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
}