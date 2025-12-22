import { NextRequest, NextResponse } from 'next/server';

// Mock debate history data
function generateMockDebateHistory(symbol: string, date: string) {
  const SYMBOL_MAP: Record<string, { name: string; sector: string }> = {
    '005930': { name: '삼성전자', sector: 'Semiconductor' },
    '000660': { name: 'SK하이닉스', sector: 'Semiconductor' },
    '373220': { name: 'LG에너지솔루션', sector: 'Battery' },
    '207940': { name: '삼성바이오로직스', sector: 'Bio' },
    '005380': { name: '현대차', sector: 'Auto' },
    '006400': { name: '삼성SDI', sector: 'Battery' },
    '035720': { name: '카카오', sector: 'IT Service' },
    '035420': { name: 'NAVER', sector: 'IT Service' },
    '051910': { name: 'LG화학', sector: 'Chemical' },
    '000270': { name: '기아', sector: 'Auto' },
    '105560': { name: 'KB금융', sector: 'Finance' },
    '055550': { name: '신한지주', sector: 'Finance' },
    '068270': { name: '셀트리온', sector: 'Bio' },
  };

  const symbolInfo = SYMBOL_MAP[symbol] || { name: symbol, sector: 'Unknown' };
  const basePrice = 70000 + (parseInt(symbol) % 100) * 1000;

  const messages = [
    // Round 1
    {
      id: `${symbol}-${date}-claude-1`,
      character: 'claude' as const,
      content: `제 분석으로는 ${symbolInfo.name}의 펀더멘털이 상당히 견고합니다. 최근 분기 실적을 보면 매출 성장률이 전년 대비 15% 이상 증가했고, 영업이익률도 개선되고 있습니다.\n\n저는 이 종목에 대해 긍정적인 견해를 갖고 있습니다. 다만 현재 PER이 업종 평균 대비 높은 편이므로, 밸류에이션 부담은 인지하고 있어야 합니다.`,
      score: 4,
      targetPrice: Math.round(basePrice * 1.15 / 100) * 100,
      targetDate: '2025년 3월',
      risks: ['밸류에이션 부담', '실적 성장 둔화 가능성'],
      round: 1,
    },
    {
      id: `${symbol}-${date}-gemini-1`,
      character: 'gemini' as const,
      content: `저는 ${symbolInfo.name}에 대해 상당히 낙관적인 시각을 갖고 있습니다. 솔직히 이 종목의 성장 잠재력은 현재 주가에 충분히 반영되지 않았다고 봅니다.\n\n특히 AI와 신기술 분야에서의 투자 확대가 눈에 띕니다. ${symbolInfo.sector} 업종 내에서 혁신을 주도하고 있으며, 글로벌 경쟁력도 강화되고 있습니다.`,
      score: 5,
      targetPrice: Math.round(basePrice * 1.30 / 100) * 100,
      targetDate: '2025년 6월',
      risks: ['기술 변화 대응 속도', '신사업 불확실성'],
      round: 1,
    },
    {
      id: `${symbol}-${date}-gpt-1`,
      character: 'gpt' as const,
      content: `제 40년 경험에 비추어 보면, ${symbolInfo.name}을 평가할 때는 거시경제 환경을 반드시 고려해야 합니다. 현재 금리 수준과 경기 사이클을 감안하면, ${symbolInfo.sector} 업종 전반에 신중한 접근이 필요합니다.\n\n물론 ${symbolInfo.name}이 업종 내 우량 기업이라는 점은 인정합니다. 하지만 글로벌 불확실성이 해소되기 전까지는 보수적인 시각을 유지하는 것이 현명해 보입니다.`,
      score: 3,
      targetPrice: Math.round(basePrice * 1.08 / 100) * 100,
      targetDate: '2025년 2월',
      risks: ['금리 인상 영향', '경기 침체 우려', '지정학적 리스크'],
      round: 1,
    },
    // Round 2
    {
      id: `${symbol}-${date}-claude-2`,
      character: 'claude' as const,
      content: `Gemini님의 성장성 분석이 인상적이었습니다. 저도 ${symbolInfo.name}의 성장 잠재력에는 동의합니다. 다만 제 관점에서는 밸류에이션도 함께 봐야 한다고 생각합니다.\n\nGPT님이 언급하신 거시 리스크도 일리가 있습니다. 하지만 ${symbolInfo.name}의 재무 건전성을 고려하면, 이런 외부 충격에도 버틸 체력이 있다고 봅니다. 종합하면 저는 여전히 긍정적이며, 기존 목표가를 유지합니다.`,
      score: 4,
      targetPrice: Math.round(basePrice * 1.15 / 100) * 100,
      targetDate: '2025년 3월',
      risks: ['업종 내 경쟁 심화', '원자재 가격 변동'],
      round: 2,
    },
    {
      id: `${symbol}-${date}-gemini-2`,
      character: 'gemini' as const,
      content: `Claude님의 밸류에이션 분석은 좋았지만, 저는 좀 다르게 생각합니다. 성장주를 평가할 때 현재 PER보다 미래 성장률이 더 중요합니다.\n\nGPT님이 리스크를 강조하셨는데, 솔직히 말해서 리스크만 보면 어떤 투자도 할 수 없습니다. ${symbolInfo.name}의 혁신 역량과 시장 기회를 고려하면, 저는 오히려 지금이 기회라고 확신하며, 공격적인 목표가를 유지합니다.`,
      score: 5,
      targetPrice: Math.round(basePrice * 1.32 / 100) * 100,
      targetDate: '2025년 6월',
      risks: ['경쟁사 추격', '규제 환경 변화'],
      round: 2,
    },
    {
      id: `${symbol}-${date}-gpt-2`,
      character: 'gpt' as const,
      content: `Claude 분석가와 Gemini 분석가의 의견을 종합해보겠습니다. 펀더멘털과 성장성 모두 긍정적인 포인트가 있다는 것에는 동의합니다.\n\n하지만 제가 강조하고 싶은 건, 아무리 좋은 기업도 거시 환경을 이길 수는 없다는 점입니다. ${symbolInfo.name}이 좋은 기업인 건 맞지만, 현 시점에서는 리스크 관리가 필요합니다. 목표가는 소폭 상향하지만 보수적으로 유지하겠습니다.`,
      score: 3,
      targetPrice: Math.round(basePrice * 1.10 / 100) * 100,
      targetDate: '2025년 2월',
      risks: ['환율 변동성', '글로벌 공급망 이슈', '인플레이션 압력'],
      round: 2,
    },
  ];

  return {
    sessionId: `${symbol}-${date}-session`,
    symbol,
    symbolName: symbolInfo.name,
    date,
    messages,
    consensusTarget: Math.round((messages[0].targetPrice! + messages[1].targetPrice! + messages[2].targetPrice!) / 3 / 100) * 100,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    // For now, return mock data
    // In production, this would query the database for actual debate history
    const mockDate = date || new Date().toISOString().split('T')[0];
    const debateHistory = generateMockDebateHistory(symbol, mockDate);

    return NextResponse.json({
      success: true,
      data: debateHistory,
    });
  } catch (error) {
    console.error('Failed to fetch debate history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debate history' },
      { status: 500 }
    );
  }
}





