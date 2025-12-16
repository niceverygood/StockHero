import { NextResponse } from 'next/server';
import { fetchMultipleStockPrices } from '@/lib/market-data/kis';

// 종목명 매핑
const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '373220': 'LG에너지솔루션',
  '035720': '카카오',
  '068270': '셀트리온',
  '035420': 'NAVER',
  '105560': 'KB금융',
};

// 오늘의 Top 5 추천 (AI 합의 기반)
const TOP5_RECOMMENDATIONS = [
  { 
    rank: 1, 
    symbolId: '1', 
    symbol: '005930', 
    name: '삼성전자', 
    avgScore: 4.7, 
    rationale: '세 분석가 모두 삼성전자에 대해 4점 이상의 긍정적 평가를 내렸습니다.',
    unanimous: true,
  },
  { 
    rank: 2, 
    symbolId: '2', 
    symbol: '000660', 
    name: 'SK하이닉스', 
    avgScore: 4.5, 
    rationale: 'HBM 수요 증가에 따른 수혜가 예상됩니다.',
    unanimous: true,
  },
  { 
    rank: 3, 
    symbolId: '3', 
    symbol: '373220', 
    name: 'LG에너지솔루션', 
    avgScore: 4.3, 
    rationale: '2차전지 업종 내 글로벌 경쟁력을 갖추고 있습니다.',
    unanimous: false,
  },
  { 
    rank: 4, 
    symbolId: '7', 
    symbol: '035720', 
    name: '카카오', 
    avgScore: 4.2, 
    rationale: 'IT서비스 업종 내 플랫폼 경쟁력이 있습니다.',
    unanimous: false,
  },
  { 
    rank: 5, 
    symbolId: '10', 
    symbol: '068270', 
    name: '셀트리온', 
    avgScore: 4.1, 
    rationale: '바이오시밀러 시장 점유율 확대가 긍정적입니다.',
    unanimous: false,
  },
];

export async function GET() {
  // 실시간 가격 조회
  const symbols = TOP5_RECOMMENDATIONS.map(item => item.symbol);
  let realTimePrices: Map<string, { price: number; change: number; changePercent: number; name: string }> = new Map();
  
  try {
    realTimePrices = await fetchMultipleStockPrices(symbols);
  } catch (error) {
    console.error('Failed to fetch real-time prices for verdict:', error);
  }
  
  // 실시간 가격 병합
  const top5WithPrices = TOP5_RECOMMENDATIONS.map(item => {
    const realPrice = realTimePrices.get(item.symbol);
    // 종목명: STOCK_NAMES 우선 사용 (API가 종목코드를 반환하는 경우가 있음)
    const stockName = STOCK_NAMES[item.symbol] || realPrice?.name || item.name;
    return {
      ...item,
      name: stockName,
      currentPrice: realPrice?.price || 0,
      change: realPrice?.change || 0,
      changePercent: realPrice?.changePercent || 0,
    };
  });
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = today.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return NextResponse.json({
    success: true,
    isRealTime: realTimePrices.size > 0,
    date: dateStr,
    time: timeStr,
    unanimousCount: TOP5_RECOMMENDATIONS.filter(item => item.unanimous).length,
    rationale: 'Top 5 중 2개 종목이 만장일치 합의를 얻었습니다. 반도체, 2차전지, IT서비스 업종에 대한 선호가 두드러집니다.',
    top5: top5WithPrices,
  });
}

