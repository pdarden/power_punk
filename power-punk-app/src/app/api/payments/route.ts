import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { walrusClient } from '@/lib/walrus/client';
import { ProjectAgent } from '@/lib/coinbase/agentkit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      campaignId, 
      amount, 
      units, 
      fromWallet,
      referralCode 
    } = body;

    // Get campaign details
    const supabase = await createClient();
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, project_wallets(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Get project wallet address
    const projectWallet = campaign.project_wallets[0];
    if (!projectWallet) {
      throw new Error('Project wallet not found');
    }

    // Process payment (in production, this would handle actual blockchain transaction)
    // For now, we'll simulate the payment
    const paymentId = `payment_${Date.now()}`;
    
    // Record payment in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        campaign_id: campaignId,
        from_wallet: fromWallet,
        to_wallet: projectWallet.wallet_address,
        amount,
        units,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Update Walrus with new contributor
    const contributor = {
      walletAddress: fromWallet,
      units,
      totalAmountPaid: amount,
      timestamp: new Date().toISOString(),
    };

    const newWalrusId = await walrusClient.addContributor(
      campaign.walrus_id,
      contributor
    );

    // Handle referral if provided
    if (referralCode) {
      const referrerWallet = referralCode; // In production, decode referral code
      await walrusClient.addReferral(
        campaign.walrus_id,
        referrerWallet,
        fromWallet
      );
    }

    // Update payment status to completed
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId);

    // Notify agent about payment
    const agent = new ProjectAgent();
    await agent.handlePaymentReceived(amount, fromWallet, units);

    return NextResponse.json({
      success: true,
      payment,
      newWalrusId,
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const walletAddress = searchParams.get('wallet');

    const supabase = await createClient();
    let query = supabase.from('payments').select('*');

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (walletAddress) {
      query = query.or(`from_wallet.eq.${walletAddress},to_wallet.eq.${walletAddress}`);
    }

    const { data: payments, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}