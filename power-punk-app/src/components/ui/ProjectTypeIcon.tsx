import { ProjectType } from '@/types';
import { 
  Sun, 
  Battery, 
  Trees, 
  Wind, 
  Leaf, 
  Zap, 
  Cpu, 
  Server 
} from 'lucide-react';

interface ProjectTypeIconProps {
  type: ProjectType;
  className?: string;
}

export default function ProjectTypeIcon({ type, className = "w-4 h-4" }: ProjectTypeIconProps) {
  const iconMap = {
    solar_microgrid: Sun,
    batteries: Battery,
    community_park: Trees,
    hvac_system: Wind,
    tree_planting: Leaf,
    electrification: Zap,
    bitcoin_mining: Cpu,
    gpu_infrastructure: Server,
  };

  const Icon = iconMap[type] || Sun;
  
  return <Icon className={className} />;
}

export function getProjectTypeLabel(type: ProjectType): string {
  const labelMap = {
    solar_microgrid: 'Solar Microgrid',
    batteries: 'Battery Storage',
    community_park: 'Community Park',
    hvac_system: 'HVAC System',
    tree_planting: 'Tree Planting',
    electrification: 'Electrification',
    bitcoin_mining: 'Bitcoin Mining',
    gpu_infrastructure: 'GPU Infrastructure',
  };

  return labelMap[type] || type;
}

export function getProjectTypeColor(type: ProjectType): string {
  const colorMap = {
    solar_microgrid: 'text-yellow-600',
    batteries: 'text-green-600',
    community_park: 'text-emerald-600',
    hvac_system: 'text-blue-600',
    tree_planting: 'text-green-700',
    electrification: 'text-purple-600',
    bitcoin_mining: 'text-orange-600',
    gpu_infrastructure: 'text-indigo-600',
  };

  return colorMap[type] || 'text-gray-600';
}