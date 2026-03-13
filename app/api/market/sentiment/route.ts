export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// 네이버 금융에서 시장 지수 조회
async function fetchNaverIndex(indexCode: string): Promise<{
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high52w: number;
    low52w: number;
} | null> {
    try {
        const response = await fetch(
            `https://m.stock.naver.com/api/index/${indexCode}/basic`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                next: { revalidate: 300 }, // 5분 캐시
            }
        );

        if (!response.ok) return null;
        const data = await response.json();

        const parseNum = (s: string | undefined) => {
            if (!s) return 0;
            return parseFloat(s.replace(/,/g, '')) || 0;
        };

        return {
            name: data.stockName || data.indexName || indexCode,
            price: parseNum(data.closePrice),
            change: parseNum(data.compareToPreviousClosePrice),
            changePercent: parseNum(data.fluctuationsRatio),
            high52w: parseNum(data.high52wPrice),
            low52w: parseNum(data.low52wPrice),
        };
    } catch (e) {
        console.error(`Failed to fetch index ${indexCode}:`, e);
        return null;
    }
}

// Yahoo Finance에서 글로벌 지수 조회
async function fetchYahooIndex(symbol: string, displayName: string): Promise<{
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high52w: number;
    low52w: number;
} | null> {
    try {
        const encoded = encodeURIComponent(symbol);
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=1d`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                next: { revalidate: 300 },
            }
        );

        if (!response.ok) return null;
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const change = price - prevClose;
        const changePercent = prevClose ? ((change / prevClose) * 100) : 0;

        return {
            name: meta.longName || meta.shortName || displayName,
            price,
            change,
            changePercent,
            high52w: meta.fiftyTwoWeekHigh || 0,
            low52w: meta.fiftyTwoWeekLow || 0,
        };
    } catch (e) {
        console.error(`Failed to fetch Yahoo index ${symbol}:`, e);
        return null;
    }
}

// 환율 조회 (네이버 → Yahoo 폴백)
async function fetchExchangeRate(): Promise<{
    rate: number;
    change: number;
    changePercent: number;
} | null> {
    // 1. 네이버 시도
    try {
        const response = await fetch(
            'https://m.stock.naver.com/api/exchange/FX_USDKRW/basic',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                next: { revalidate: 300 },
            }
        );
        if (response.ok) {
            const data = await response.json();
            const parseNum = (s: string | undefined) => {
                if (!s) return 0;
                return parseFloat(s.replace(/,/g, '')) || 0;
            };
            const rate = parseNum(data.closePrice);
            if (rate > 0) {
                return {
                    rate,
                    change: parseNum(data.compareToPreviousClosePrice),
                    changePercent: parseNum(data.fluctuationsRatio),
                };
            }
        }
    } catch (e) {
        console.warn('Naver exchange rate failed, trying Yahoo:', e);
    }

    // 2. Yahoo 폴백
    try {
        const res = await fetch(
            'https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?range=1d&interval=1d',
            {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                next: { revalidate: 300 },
            }
        );
        if (res.ok) {
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            if (meta) {
                const price = meta.regularMarketPrice || 0;
                const prev = meta.chartPreviousClose || price;
                const change = price - prev;
                return {
                    rate: price,
                    change,
                    changePercent: prev ? (change / prev) * 100 : 0,
                };
            }
        }
    } catch (e) {
        console.error('Yahoo exchange rate also failed:', e);
    }
    return null;
}

// ----- 점수 계산 로직 -----

interface IndexData {
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high52w: number;
    low52w: number;
}

// 52주 내 위치 기반 점수 (0 = 저점, 100 = 고점)
function calc52WeekPosition(data: IndexData): number {
    if (!data.high52w || !data.low52w || data.high52w === data.low52w) return 50;
    const position = ((data.price - data.low52w) / (data.high52w - data.low52w)) * 100;
    return Math.max(0, Math.min(100, position));
}

// 일간 변동률 → 점수 (급등 = 과열, 급락 = 공포)
function calcDailyChangeScore(changePercent: number): number {
    const normalized = (changePercent + 3) / 6 * 100;
    return Math.max(0, Math.min(100, normalized));
}

// 환율 점수 (환율 상승 = 외자 유출 = 매도 우위)
function calcExchangeScore(changePercent: number): number {
    const normalized = 50 - (changePercent * 40);
    return Math.max(0, Math.min(100, normalized));
}

// 시장 레벨 판정 함수
function getMarketLevel(score: number): {
    level: 'extreme_fear' | 'fear' | 'caution' | 'neutral' | 'optimistic' | 'greed' | 'extreme_greed';
    label: string;
    emoji: string;
    color: string;
    action: string;
    actionDetail: string;
    buyWeight: number;
    sellWeight: number;
} {
    if (score <= 15) return {
        level: 'extreme_fear', label: '극도의 공포', emoji: '🔴', color: 'red',
        action: '적극 매수 구간',
        actionDetail: '시장이 극도의 공포 구간입니다. 워렌 버핏의 격언처럼 "공포에 매수"하세요. AI Top 5 종목 중 확신 종목 위주로 공격적 매수를 고려할 수 있습니다.',
        buyWeight: 1.0, sellWeight: 0.0,
    };
    if (score <= 30) return {
        level: 'fear', label: '공포', emoji: '🟠', color: 'orange',
        action: '매수 우위',
        actionDetail: '시장 공포 구간입니다. 장기 투자 관점에서 좋은 매수 기회입니다. 분할 매수로 리스크를 관리하며 진입하세요.',
        buyWeight: 0.8, sellWeight: 0.1,
    };
    if (score <= 40) return {
        level: 'caution', label: '경계', emoji: '🟡', color: 'yellow',
        action: '매수 관망',
        actionDetail: '시장이 다소 불안정합니다. 핵심 종목 위주로 소규모 매수하되, 추가 하락 시 추매 여력을 남겨두세요.',
        buyWeight: 0.6, sellWeight: 0.2,
    };
    if (score <= 60) return {
        level: 'neutral', label: '중립', emoji: '⚖️', color: 'blue',
        action: '균형 투자',
        actionDetail: '시장 센티먼트가 중립적입니다. AI 추천 점수에 따라 정상적인 비중으로 매매하세요.',
        buyWeight: 0.5, sellWeight: 0.5,
    };
    if (score <= 70) return {
        level: 'optimistic', label: '낙관', emoji: '🟢', color: 'green',
        action: '소폭 매도 관망',
        actionDetail: '시장이 낙관적입니다. 기존 보유 종목 수익을 지키되, 신규 매수는 신중하게 접근하세요.',
        buyWeight: 0.4, sellWeight: 0.5,
    };
    if (score <= 85) return {
        level: 'greed', label: '탐욕', emoji: '🔶', color: 'amber',
        action: '매도 우위',
        actionDetail: '시장이 탐욕 구간입니다. 수익 중인 종목은 일부 이익 실현하고, 5점 만점 종목도 매수 비중을 줄이세요.',
        buyWeight: 0.2, sellWeight: 0.7,
    };
    return {
        level: 'extreme_greed', label: '극도의 탐욕', emoji: '🔴', color: 'red',
        action: '적극 매도 구간',
        actionDetail: '시장이 극도로 과열되었습니다! AI 5점 만점 종목이라도 신규 매수를 자제하고, 보유 종목 이익 실현을 우선하세요. 현금 비중을 높이세요.',
        buyWeight: 0.0, sellWeight: 1.0,
    };
}

export async function GET() {
    try {
        // 병렬로 시장 데이터 조회: 한국(Naver) + 해외(Yahoo)
        const [kospi, kosdaq, sp500, nasdaq, vix, exchangeRate] = await Promise.all([
            fetchNaverIndex('KOSPI'),
            fetchNaverIndex('KOSDAQ'),
            fetchYahooIndex('^GSPC', 'S&P 500'),
            fetchYahooIndex('^IXIC', 'NASDAQ'),
            fetchYahooIndex('^VIX', 'VIX'),
            fetchExchangeRate(),
        ]);

        const sp500Data = sp500;

        // 각 지표별 센티먼트 점수 계산 (0=극도의 공포, 50=중립, 100=극도의 탐욕)
        const scores: { name: string; score: number; weight: number; detail: string }[] = [];

        // 1. KOSPI 일간 변동률 (가장 중요 - 가중치 30%)
        if (kospi) {
            const dailyScore = calcDailyChangeScore(kospi.changePercent);
            const positionScore = calc52WeekPosition(kospi);
            // 일간 변동률 60% + 52주 위치 40%
            const combined = dailyScore * 0.6 + positionScore * 0.4;
            scores.push({
                name: 'KOSPI',
                score: combined,
                weight: 0.30,
                detail: `${kospi.price.toLocaleString()} (${kospi.changePercent >= 0 ? '+' : ''}${kospi.changePercent.toFixed(2)}%)`,
            });
        }

        // 2. KOSDAQ 일간 변동률 (가중치 15%)
        if (kosdaq) {
            const dailyScore = calcDailyChangeScore(kosdaq.changePercent);
            const positionScore = calc52WeekPosition(kosdaq);
            const combined = dailyScore * 0.6 + positionScore * 0.4;
            scores.push({
                name: 'KOSDAQ',
                score: combined,
                weight: 0.15,
                detail: `${kosdaq.price.toLocaleString()} (${kosdaq.changePercent >= 0 ? '+' : ''}${kosdaq.changePercent.toFixed(2)}%)`,
            });
        }

        // 3. 미국 시장 (S&P 500 또는 다우) (가중치 20%)
        if (sp500Data) {
            const dailyScore = calcDailyChangeScore(sp500Data.changePercent);
            const positionScore = calc52WeekPosition(sp500Data);
            const combined = dailyScore * 0.6 + positionScore * 0.4;
            scores.push({
                name: sp500Data.name || '다우존스',
                score: combined,
                weight: 0.20,
                detail: `${sp500Data.price.toLocaleString()} (${sp500Data.changePercent >= 0 ? '+' : ''}${sp500Data.changePercent.toFixed(2)}%)`,
            });
        }

        // 4. 나스닥 (가중치 15%)
        if (nasdaq) {
            const dailyScore = calcDailyChangeScore(nasdaq.changePercent);
            const positionScore = calc52WeekPosition(nasdaq);
            const combined = dailyScore * 0.6 + positionScore * 0.4;
            scores.push({
                name: nasdaq.name || '나스닥',
                score: combined,
                weight: 0.15,
                detail: `${nasdaq.price.toLocaleString()} (${nasdaq.changePercent >= 0 ? '+' : ''}${nasdaq.changePercent.toFixed(2)}%)`,
            });
        }

        // 5. VIX (공포 지수) — VIX 높으면 공포 → 낮은 점수 (가중치 10%)
        if (vix) {
            // VIX 10 = 극도의 탐욕(100), VIX 30+ = 극도의 공포(0)
            const vixScore = Math.max(0, Math.min(100, ((30 - vix.price) / 20) * 100));
            scores.push({
                name: 'VIX (공포지수)',
                score: vixScore,
                weight: 0.10,
                detail: `${vix.price.toFixed(2)} (${vix.changePercent >= 0 ? '+' : ''}${vix.changePercent.toFixed(2)}%)`,
            });
        }

        // 6. 환율 (가중치 10%)
        if (exchangeRate) {
            const fxScore = calcExchangeScore(exchangeRate.changePercent);
            scores.push({
                name: 'USD/KRW 환율',
                score: fxScore,
                weight: 0.10,
                detail: `${exchangeRate.rate.toLocaleString()}원 (${exchangeRate.changePercent >= 0 ? '+' : ''}${exchangeRate.changePercent.toFixed(2)}%)`,
            });
        }

        // 가중 합산 점수 계산
        let totalWeight = 0;
        let weightedSum = 0;
        scores.forEach(s => {
            weightedSum += s.score * s.weight;
            totalWeight += s.weight;
        });
        const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 50;
        const finalScore = Math.round(compositeScore);

        // 시장 레벨 판정
        const marketLevel = getMarketLevel(finalScore);

        // 개별 종목 점수 보정 공식 제공
        // ex) AI 추천 5점 종목: 실질 매수 점수 = 5 * buyWeight
        const adjustmentFormula = {
            description: 'AI 추천 점수 × 시장 보정 계수',
            buyWeight: marketLevel.buyWeight,
            sellWeight: marketLevel.sellWeight,
            example5pt: (5 * marketLevel.buyWeight).toFixed(1),  // 5점 만점 종목의 보정 후 매수 강도
            example3pt: (3 * marketLevel.buyWeight).toFixed(1),  // 3점 종목의 보정 후 매수 강도
        };

        // 업데이트 시간
        const now = new Date();
        const kstOffset = 9 * 60;
        const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);

        return NextResponse.json({
            success: true,
            data: {
                compositeScore: finalScore,
                level: marketLevel,
                indicators: scores.map(s => ({
                    name: s.name,
                    score: Math.round(s.score),
                    weight: s.weight,
                    detail: s.detail,
                })),
                adjustment: adjustmentFormula,
                indices: {
                    kospi: kospi ? { price: kospi.price, change: kospi.change, changePercent: kospi.changePercent } : null,
                    kosdaq: kosdaq ? { price: kosdaq.price, change: kosdaq.change, changePercent: kosdaq.changePercent } : null,
                    sp500: sp500Data ? { price: sp500Data.price, change: sp500Data.change, changePercent: sp500Data.changePercent, name: sp500Data.name } : null,
                    nasdaq: nasdaq ? { price: nasdaq.price, change: nasdaq.change, changePercent: nasdaq.changePercent, name: nasdaq.name } : null,
                    vix: vix ? { price: vix.price, change: vix.change, changePercent: vix.changePercent } : null,
                    usdkrw: exchangeRate,
                },
                updatedAt: kstTime.toISOString(),
            },
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5분 캐시
            },
        });
    } catch (error) {
        console.error('Market sentiment error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to calculate market sentiment' },
            { status: 500 }
        );
    }
}
