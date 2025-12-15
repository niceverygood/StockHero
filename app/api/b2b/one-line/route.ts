import { NextRequest, NextResponse } from 'next/server';

// Mock one-line comments for B2B API
const MOCK_COMMENTS: Record<string, { comment: string; sentiment: string; confidence: number }> = {
  '005930': {
    comment: '반도체 업황 개선 기대감과 HBM 수요 증가로 긍정적 시각 유지',
    sentiment: 'positive',
    confidence: 0.72,
  },
  '000660': {
    comment: 'AI 반도체 수요 증가에 따른 HBM 수혜 기대, 다만 메모리 가격 변동성 주시 필요',
    sentiment: 'positive',
    confidence: 0.68,
  },
  '373220': {
    comment: '전기차 시장 성장에 따른 배터리 수요 증가, 원자재 가격 안정화 시 수익성 개선 기대',
    sentiment: 'neutral',
    confidence: 0.65,
  },
  '207940': {
    comment: '바이오시밀러 글로벌 점유율 확대 중, 신약 파이프라인 진전 주목',
    sentiment: 'positive',
    confidence: 0.70,
  },
  '005380': {
    comment: '전기차 라인업 확대와 글로벌 판매 호조, 다만 중국 시장 경쟁 심화 우려',
    sentiment: 'neutral',
    confidence: 0.62,
  },
  '035720': {
    comment: '플랫폼 사업 안정화, 신규 비즈니스 모델 성과에 따라 재평가 가능',
    sentiment: 'neutral',
    confidence: 0.58,
  },
  '035420': {
    comment: '검색/커머스 안정적 성장, AI 투자 성과 가시화 기대',
    sentiment: 'positive',
    confidence: 0.66,
  },
};

const DEFAULT_COMMENT = {
  comment: '분석 데이터가 충분하지 않습니다. 추가 모니터링이 필요합니다.',
  sentiment: 'neutral',
  confidence: 0.50,
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }
    
    const data = MOCK_COMMENTS[symbol] || DEFAULT_COMMENT;
    
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        ...data,
        generatedAt: new Date().toISOString(),
        disclaimer: '본 정보는 AI 분석 결과이며 투자 조언이 아닙니다. 투자 판단의 책임은 이용자 본인에게 있습니다.',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate one-line comment' },
      { status: 500 }
    );
  }
}

