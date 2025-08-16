import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectAgent } from '@/lib/coinbase/agentkit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, campaignId } = body;

    if (action === 'create-agent') {
      // Create a new agent wallet for a project
      const { agent, walletAddress } = await createProjectAgent(campaignId);

      // Store wallet info in database
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('project_wallets')
        .insert({
          campaign_id: campaignId,
          wallet_address: walletAddress,
          agent_id: campaignId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        walletAddress,
        data,
      });
    }

    if (action === 'execute-payout') {
      const { recipientAddress, amount, reason } = body;
      
      // Get project agent
      const supabase = await createClient();
      const { data: wallet } = await supabase
        .from('project_wallets')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (!wallet) {
        throw new Error('Project wallet not found');
      }

      // Initialize agent and execute payout
      const agent = new (await import('@/lib/coinbase/agentkit')).ProjectAgent();
      const result = await agent.executePayout(recipientAddress, amount, reason);

      return NextResponse.json({
        success: true,
        result,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in wallet operation:', error);
    return NextResponse.json(
      { error: 'Wallet operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: wallet, error } = await supabase
      .from('project_wallets')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}