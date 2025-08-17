import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { walrusClient } from "@/lib/walrus/client";
import { createProjectAgent } from "@/lib/coinbase/agentkit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectData,
      location,
      projectType,
      escrowType,
      contractAddress,
      transactionHash,
      walrusId,
      ensName,
      registryAddress,
    } = body;

    const supabase = await createClient();
    const projectId = `project_${Date.now()}`;

    if (escrowType === "contract") {
      // Smart contract escrow project
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          id: projectId,
          walrus_id: walrusId,
          owner_id: body.userId,
          status: "active",
          location,
          project_type: projectType,
          escrow_type: "contract",
          contract_address: contractAddress,
          transaction_hash: transactionHash,
          ens_name: ensName,
          registry_address: registryAddress,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        campaign,
        contractAddress,
        transactionHash,
      });
    } else {
      // Agent-based escrow project (existing logic)
      const storedWalrusId = await walrusClient.storeProjectData(projectData);
      const { walletAddress } = await createProjectAgent(projectId);

      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          id: projectId,
          walrus_id: storedWalrusId,
          owner_id: body.userId,
          status: "active",
          location,
          project_type: projectType,
          escrow_type: "agent",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Store wallet info for agent projects
      await supabase.from("project_wallets").insert({
        campaign_id: projectId,
        wallet_address: walletAddress,
        agent_id: projectId,
      });

      return NextResponse.json({
        success: true,
        campaign,
        walletAddress,
      });
    }
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectType = searchParams.get("type");

    let query = supabase.from("campaigns").select("*");

    if (status) {
      query = query.eq("status", status);
    }

    if (projectType) {
      query = query.eq("project_type", projectType);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      throw error;
    }

    // Fetch project data from Walrus for each campaign
    const projectsWithData = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const projectData = await walrusClient.getProjectData(
            campaign.walrus_id,
          );
          return { campaign, projectData };
        } catch (error) {
          console.error(
            `Failed to fetch Walrus data for ${campaign.walrus_id}:`,
            error,
          );
          return { campaign, projectData: null };
        }
      }),
    );

    return NextResponse.json({
      success: true,
      projects: projectsWithData,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
