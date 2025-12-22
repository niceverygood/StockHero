import { NextRequest, NextResponse } from 'next/server';
import { calculateMetrics, generateMockPredictions } from '@/lib/scoring/backtest-lite';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    let days = 7;
    if (range === '30d') {
      days = 30;
    } else if (range === '90d') {
      days = 90;
    }
    
    // Generate mock predictions for the specified range
    const predictions = generateMockPredictions(days);
    const metrics = calculateMetrics(predictions);
    
    return NextResponse.json({
      success: true,
      data: {
        range,
        metrics,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Archive metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}





