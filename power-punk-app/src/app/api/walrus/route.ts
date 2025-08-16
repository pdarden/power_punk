import { NextRequest, NextResponse } from 'next/server';
import { walrusClient } from '@/lib/walrus/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walrusId = searchParams.get('id');

    if (!walrusId) {
      return NextResponse.json(
        { error: 'Walrus ID is required' },
        { status: 400 }
      );
    }

    const projectData = await walrusClient.getProjectData(walrusId);

    return NextResponse.json({
      success: true,
      data: projectData,
    });
  } catch (error) {
    console.error('Error fetching from Walrus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Walrus' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const walrusId = await walrusClient.storeProjectData(body);

    return NextResponse.json({
      success: true,
      walrusId,
    });
  } catch (error) {
    console.error('Error storing to Walrus:', error);
    return NextResponse.json(
      { error: 'Failed to store data in Walrus' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { walrusId, updates } = body;

    if (!walrusId) {
      return NextResponse.json(
        { error: 'Walrus ID is required' },
        { status: 400 }
      );
    }

    const newWalrusId = await walrusClient.updateProjectData(walrusId, updates);

    return NextResponse.json({
      success: true,
      newWalrusId,
    });
  } catch (error) {
    console.error('Error updating Walrus data:', error);
    return NextResponse.json(
      { error: 'Failed to update data in Walrus' },
      { status: 500 }
    );
  }
}