'use client';

import { useState } from 'react';
import CreateProjectTransaction from './CreateProjectTransaction';
import CreateProjectSmartContract from './CreateProjectSmartContract';

interface CreateProjectEscrowProps {
  projectData: {
    projectTitle: string;
    description: string;
    initialUnitCost: number;
    goalAmount: number;
    escrowType: 'agent' | 'contract';
    location: {
      country: string;
      region: string;
      lat: string;
      lng: string;
    };
    projectType: string;
    timeline: any;
    milestones: any[];
    costCurve: any;
  };
  onSuccess?: (transactionHash: string, projectId: string) => void;
}

export default function CreateProjectEscrow({
  projectData,
  onSuccess,
}: CreateProjectEscrowProps) {
  if (projectData.escrowType === 'agent') {
    return (
      <div>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-1">Agent Escrow Selected</h4>
          <p className="text-sm text-blue-700">
            Your project will use CDP AgentKit for intelligent fund management. 
            The AI agent will handle distributions and can make smart decisions about payouts.
          </p>
        </div>
        <CreateProjectTransaction 
          projectData={projectData} 
          onSuccess={onSuccess} 
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-800 mb-1">Smart Contract Escrow Selected</h4>
        <p className="text-sm text-green-700">
          Your project will use the CoopEscrow smart contract for trustless fund management. 
          Contributors can get automatic refunds if goals aren&apos;t met.
        </p>
      </div>
      <CreateProjectSmartContract 
        projectData={projectData} 
        onSuccess={onSuccess} 
      />
    </div>
  );
}