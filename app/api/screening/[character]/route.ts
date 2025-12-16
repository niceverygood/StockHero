import { NextRequest, NextResponse } from 'next/server';
import { fetchAllStockPrices, screenStocks, type CharacterType } from '@/lib/stock-data';

const VALID_CHARACTERS: CharacterType[] = ['claude', 'gemini', 'gpt'];

/**
 * GET /api/screening/[character]
 * 
 * AI 캐릭터별 추천 종목 스크리닝
 * 실시간 주가 + 재무 데이터 기반 알고리즘 적용
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ character: string }> }
) {
  const { character } = await params;
  
  // 캐릭터 검증
  if (!VALID_CHARACTERS.includes(character as CharacterType)) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Invalid character. Must be one of: ${VALID_CHARACTERS.join(', ')}` 
      },
      { status: 400 }
    );
  }
  
  const charType = character as CharacterType;
  
  try {
    // 1. 실시간 주가 수집
    const fetchResult = await fetchAllStockPrices();
    
    if (!fetchResult.success || fetchResult.data.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch stock prices',
          details: fetchResult.errors,
        },
        { status: 500 }
      );
    }
    
    // 2. 스크리닝 실행
    const screeningResult = screenStocks(fetchResult.data, charType, 5);
    
    // 3. 응답 구성
    const response = {
      success: true,
      character: screeningResult.character,
      characterName: screeningResult.characterName,
      philosophy: screeningResult.philosophy,
      generatedAt: screeningResult.generatedAt.toISOString(),
      dataSource: fetchResult.source,
      stockCount: fetchResult.data.length,
      top5: screeningResult.stocks.map((stock, index) => ({
        rank: index + 1,
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sectorName,
        
        // 가격 정보
        currentPrice: stock.currentPrice,
        change: stock.change,
        changePercent: stock.changePercent,
        
        // 목표가
        targetPrice: stock.targetPrice,
        upside: Math.round((stock.targetPriceRatio - 1) * 100),
        
        // 점수
        score: stock.scores.total,
        scoreBreakdown: stock.scores.breakdown,
        
        // 분석
        reason: stock.reason,
        risks: stock.risks,
        keyMetrics: stock.keyMetrics,
      })),
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`Screening error for ${character}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Screening failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

