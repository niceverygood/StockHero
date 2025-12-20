import { NextRequest, NextResponse } from 'next/server';
import { createDebateSession, getSymbolByCode } from '@/lib/supabase';

// Fallback symbol lookup
const MOCK_SYMBOLS: Record<string, { name: string; sector: string }> = {
  // Korean stocks - 시가총액 상위
  '005930': { name: '삼성전자', sector: '반도체' },
  '000660': { name: 'SK하이닉스', sector: '반도체' },
  '373220': { name: 'LG에너지솔루션', sector: '2차전지' },
  '207940': { name: '삼성바이오로직스', sector: '바이오' },
  '005380': { name: '현대차', sector: '자동차' },
  '006400': { name: '삼성SDI', sector: '2차전지' },
  '035720': { name: '카카오', sector: 'IT서비스' },
  '035420': { name: 'NAVER', sector: 'IT서비스' },
  // Korean stocks - 금융
  '086790': { name: '하나금융지주', sector: '금융' },
  '105560': { name: 'KB금융', sector: '금융' },
  '055550': { name: '신한지주', sector: '금융' },
  '316140': { name: '우리금융지주', sector: '금융' },
  '024110': { name: '기업은행', sector: '금융' },
  '138930': { name: 'BNK금융지주', sector: '금융' },
  // Korean stocks - 추가
  '051910': { name: 'LG화학', sector: '화학' },
  '000270': { name: '기아', sector: '자동차' },
  '017670': { name: 'SK텔레콤', sector: '통신' },
  '068270': { name: '셀트리온', sector: '바이오' },
  '003550': { name: 'LG', sector: '지주' },
  '028260': { name: '삼성물산', sector: '건설/지주' },
  '012330': { name: '현대모비스', sector: '자동차부품' },
  '066570': { name: 'LG전자', sector: '전자' },
  '034730': { name: 'SK', sector: '지주' },
  '096770': { name: 'SK이노베이션', sector: '에너지/화학' },
  '003670': { name: '포스코홀딩스', sector: '철강/지주' },
  '015760': { name: '한국전력', sector: '전력' },
  '033780': { name: 'KT&G', sector: '담배/식품' },
  '030200': { name: 'KT', sector: '통신' },
  '032830': { name: '삼성생명', sector: '보험' },
  '009150': { name: '삼성전기', sector: '전자부품' },
  '010130': { name: '고려아연', sector: '비철금속' },
  '018260': { name: '삼성에스디에스', sector: 'IT서비스' },
  // US stocks
  'AAPL': { name: 'Apple', sector: 'Technology' },
  'MSFT': { name: 'Microsoft', sector: 'Technology' },
  'GOOGL': { name: 'Alphabet', sector: 'Technology' },
  'AMZN': { name: 'Amazon', sector: 'Consumer Discretionary' },
  'META': { name: 'Meta', sector: 'Technology' },
  'NVDA': { name: 'NVIDIA', sector: 'Semiconductor' },
  'TSLA': { name: 'Tesla', sector: 'Electric Vehicles' },
  'JPM': { name: 'JPMorgan Chase', sector: 'Finance' },
  'TSM': { name: 'TSMC', sector: 'Semiconductor' },
  'V': { name: 'Visa', sector: 'Finance' },
  'UNH': { name: 'UnitedHealth', sector: 'Healthcare' },
  'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare' },
  'WMT': { name: 'Walmart', sector: 'Consumer Staples' },
  'MA': { name: 'Mastercard', sector: 'Finance' },
  'PG': { name: 'Procter & Gamble', sector: 'Consumer Staples' },
  'HD': { name: 'Home Depot', sector: 'Consumer Discretionary' },
  'COST': { name: 'Costco', sector: 'Consumer Staples' },
  'ABBV': { name: 'AbbVie', sector: 'Healthcare' },
  'CRM': { name: 'Salesforce', sector: 'Technology' },
  'AMD': { name: 'AMD', sector: 'Semiconductor' },
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

    // Try to get symbol from Supabase first
    let symbolInfo: { name: string; sector: string | null } | null = null;
    
    try {
      const dbSymbol = await getSymbolByCode(symbol);
      if (dbSymbol) {
        symbolInfo = { name: dbSymbol.name, sector: dbSymbol.sector };
      }
    } catch (e) {
      console.log('Supabase lookup failed, using fallback:', e);
    }
    
    // Fallback to mock data
    if (!symbolInfo) {
      symbolInfo = MOCK_SYMBOLS[symbol];
    }

    if (!symbolInfo) {
      return NextResponse.json(
        { success: false, error: 'Unknown symbol' },
        { status: 404 }
      );
    }

    // Try to create session in Supabase
    let sessionId: string;
    try {
      const session = await createDebateSession(symbol, symbolInfo.name);
      sessionId = session.id;
    } catch (e) {
      console.log('Supabase session creation failed, using local ID:', e);
      const today = new Date().toISOString().split('T')[0];
      sessionId = `session-${symbol}-${today}-${Date.now()}`;
    }

    const response = {
      id: sessionId,
      sessionId: sessionId,
      symbol,
      symbolName: symbolInfo.name,
      sector: symbolInfo.sector,
      date: new Date().toISOString().split('T')[0],
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
      data: response,
    });
  } catch (error) {
    console.error('Failed to start debate session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start debate session' },
      { status: 500 }
    );
  }
}
