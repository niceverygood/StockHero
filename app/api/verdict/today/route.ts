import { NextResponse } from 'next/server';

// Mock today's verdict (in production, fetch from DB)
function getMockVerdict() {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    id: `verdict-${today}`,
    date: today,
    top5: [
      {
        rank: 1,
        symbolId: '1',
        symbol: '005930',
        name: '삼성전자',
        avgScore: 4.7,
        rationale: '세 분석가 모두 삼성전자에 대해 4점 이상의 긍정적 평가를 내렸습니다. 반도체 업종 내 경쟁력을 갖추고 있습니다.',
        hasUnanimous: true,
        riskFlags: ['글로벌 경기 둔화', '환율 변동'],
      },
      {
        rank: 2,
        symbolId: '2',
        symbol: '000660',
        name: 'SK하이닉스',
        avgScore: 4.5,
        rationale: 'Gemi Nine가 5점으로 가장 높게 평가했습니다. HBM 수요 증가에 따른 수혜가 예상됩니다.',
        hasUnanimous: true,
        riskFlags: ['메모리 가격 변동', '경쟁 심화'],
      },
      {
        rank: 3,
        symbolId: '3',
        symbol: '373220',
        name: 'LG에너지솔루션',
        avgScore: 4.3,
        rationale: '2차전지 업종 내 글로벌 경쟁력을 갖추고 있습니다. 다만, 원자재 가격 변동 리스크가 있습니다.',
        hasUnanimous: false,
        riskFlags: ['원자재 가격', '보조금 정책'],
      },
      {
        rank: 4,
        symbolId: '7',
        symbol: '035720',
        name: '카카오',
        avgScore: 4.2,
        rationale: 'IT서비스 업종 내 플랫폼 경쟁력이 있습니다. 신규 비즈니스 모델에 대한 기대감이 반영되었습니다.',
        hasUnanimous: false,
        riskFlags: ['규제 리스크', '광고 시장 둔화'],
      },
      {
        rank: 5,
        symbolId: '10',
        symbol: '068270',
        name: '셀트리온',
        avgScore: 4.1,
        rationale: '바이오시밀러 시장 점유율 확대가 긍정적입니다. 신약 파이프라인도 기대됩니다.',
        hasUnanimous: false,
        riskFlags: ['신약 개발 불확실성', '가격 경쟁'],
      },
    ],
    rationale: 'Top 5 중 2개 종목이 만장일치 합의를 얻었습니다. 반도체, 2차전지, IT서비스 업종에 대한 선호가 두드러집니다.',
    totalCandidates: 20,
    unanimousCount: 2,
    createdAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const verdict = getMockVerdict();
    
    return NextResponse.json({
      success: true,
      data: verdict,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch today verdict' },
      { status: 500 }
    );
  }
}








