import { NextRequest, NextResponse } from 'next/server';

// Mock symbol lookup
const MOCK_SYMBOLS: Record<string, { name: string; sector: string }> = {
  '005930': { name: '삼성전자', sector: '반도체' },
  '000660': { name: 'SK하이닉스', sector: '반도체' },
  '373220': { name: 'LG에너지솔루션', sector: '2차전지' },
  '207940': { name: '삼성바이오로직스', sector: '바이오' },
  '005380': { name: '현대차', sector: '자동차' },
  '006400': { name: '삼성SDI', sector: '2차전지' },
  '035720': { name: '카카오', sector: 'IT서비스' },
  '035420': { name: 'NAVER', sector: 'IT서비스' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const symbolInfo = MOCK_SYMBOLS[symbol];
    if (!symbolInfo) {
      return NextResponse.json(
        { success: false, error: 'Unknown symbol' },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const sessionId = `session-${symbol}-${today}-${Date.now()}`;

    // In production, this would create a DB record
    const session = {
      id: sessionId,
      symbol,
      symbolName: symbolInfo.name,
      sector: symbolInfo.sector,
      date: today,
      status: 'running',
      round: 0,
      messages: [
        {
          id: `${sessionId}-system-0`,
          role: 'SYSTEM',
          content: `${symbolInfo.name}(${symbol})에 대한 토론을 시작합니다.`,
          sources: [],
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start debate session' },
      { status: 500 }
    );
  }
}

