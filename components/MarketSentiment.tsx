'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Flame, BarChart3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface MarketIndicator {
    name: string;
    score: number;
    weight: number;
    detail: string;
}

interface MarketLevel {
    level: string;
    label: string;
    emoji: string;
    color: string;
    action: string;
    actionDetail: string;
    buyWeight: number;
    sellWeight: number;
}

interface IndexInfo {
    price: number;
    change: number;
    changePercent: number;
    name?: string;
}

interface MarketData {
    compositeScore: number;
    level: MarketLevel;
    indicators: MarketIndicator[];
    adjustment: {
        description: string;
        buyWeight: number;
        sellWeight: number;
        example5pt: string;
        example3pt: string;
    };
    indices: {
        kospi: IndexInfo | null;
        kosdaq: IndexInfo | null;
        sp500: (IndexInfo & { name?: string }) | null;
        nasdaq: (IndexInfo & { name?: string }) | null;
        vix: IndexInfo | null;
        usdkrw: { rate: number; change: number; changePercent: number } | null;
    };
    updatedAt: string;
}

const GAUGE_LABELS = [
    { pos: 0, label: '극도의 공포' },
    { pos: 25, label: '공포' },
    { pos: 50, label: '중립' },
    { pos: 75, label: '탐욕' },
    { pos: 100, label: '극도의 탐욕' },
];

export function MarketSentiment() {
    const [data, setData] = useState<MarketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/market/sentiment');
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            } else {
                setError(true);
            }
        } catch (e) {
            console.error('market sentiment fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // 5분마다 자동 갱신
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-dark-700 rounded-lg" />
                    <div className="h-5 w-48 bg-dark-700 rounded" />
                </div>
                <div className="h-24 bg-dark-800 rounded-xl mb-4" />
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-dark-800 rounded-lg" />
                    <div className="h-16 bg-dark-800 rounded-lg" />
                    <div className="h-16 bg-dark-800 rounded-lg" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-6 text-center">
                <p className="text-dark-400 mb-3">시장 센티먼트 데이터를 불러올 수 없습니다</p>
                <button onClick={fetchData} className="px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 transition-colors text-sm">
                    <RefreshCw className="w-4 h-4 inline mr-1" /> 다시 시도
                </button>
            </div>
        );
    }

    const { compositeScore, level, indicators, adjustment, indices, updatedAt } = data;

    // 게이지 바 색상
    const getGaugeColor = (score: number) => {
        if (score <= 20) return 'from-blue-600 to-blue-400';     // 극 공포 → 매수
        if (score <= 35) return 'from-cyan-600 to-cyan-400';     // 공포
        if (score <= 45) return 'from-teal-500 to-emerald-400';  // 경계
        if (score <= 55) return 'from-emerald-500 to-green-400'; // 중립
        if (score <= 65) return 'from-yellow-500 to-amber-400';  // 낙관
        if (score <= 80) return 'from-orange-500 to-amber-500';  // 탐욕
        return 'from-red-600 to-red-400';                        // 극 탐욕
    };

    // 매매 시그널 색상
    const getActionColor = () => {
        if (compositeScore <= 30) return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
        if (compositeScore <= 45) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
        if (compositeScore <= 55) return 'text-dark-300 bg-dark-700/50 border-dark-600/30';
        if (compositeScore <= 70) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
        return 'text-red-400 bg-red-500/15 border-red-500/30';
    };

    // 시그널 아이콘
    const getActionIcon = () => {
        if (compositeScore <= 30) return <TrendingUp className="w-5 h-5" />;
        if (compositeScore <= 45) return <Shield className="w-5 h-5" />;
        if (compositeScore <= 55) return <BarChart3 className="w-5 h-5" />;
        if (compositeScore <= 70) return <AlertTriangle className="w-5 h-5" />;
        return <TrendingDown className="w-5 h-5" />;
    };

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return '';
        }
    };

    const formatChange = (change: number, percent: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
    };

    return (
        <div className="bg-dark-900/80 border border-dark-800 rounded-2xl overflow-hidden">
            {/* 헤더 + 핵심 시그널 */}
            <div className="p-5 sm:p-6">
                {/* 타이틀 & 새로고침 */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/30 to-purple-500/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-brand-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-dark-100">시장 타이밍 시그널</h3>
                            <p className="text-2xs text-dark-600">
                                {formatTime(updatedAt)} 기준 · KOSPI & 해외시장 종합
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg bg-dark-800/60 hover:bg-dark-700 transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw className="w-4 h-4 text-dark-500" />
                    </button>
                </div>

                {/* 게이지 미터 */}
                <div className="relative mb-4">
                    {/* 배경 트랙 */}
                    <div className="h-3 rounded-full bg-dark-800 overflow-hidden relative">
                        {/* 그라데이션 바 */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-yellow-500 to-red-500 opacity-20" />
                        {/* 현재 위치 바 */}
                        <div
                            className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${getGaugeColor(compositeScore)} transition-all duration-1000 ease-out`}
                            style={{ width: `${compositeScore}%` }}
                        />
                    </div>
                    {/* 포인터 */}
                    <div
                        className="absolute top-0 -translate-x-1/2 transition-all duration-1000 ease-out"
                        style={{ left: `${compositeScore}%` }}
                    >
                        <div className={`w-5 h-5 -mt-1 rounded-full border-2 border-dark-900 bg-gradient-to-r ${getGaugeColor(compositeScore)} shadow-lg shadow-current`} />
                    </div>
                    {/* 라벨 */}
                    <div className="flex justify-between mt-2 px-0.5">
                        <span className="text-[10px] text-blue-400">매수 구간</span>
                        <span className="text-[10px] text-dark-600">중립</span>
                        <span className="text-[10px] text-red-400">매도 구간</span>
                    </div>
                </div>

                {/* 핵심 수치 + 시그널 */}
                <div className="flex items-stretch gap-3 mb-4">
                    {/* 점수 */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-20 rounded-xl bg-dark-800/60 p-3">
                        <span className={`text-3xl font-black tabular-nums ${compositeScore <= 30 ? 'text-blue-400' :
                                compositeScore <= 45 ? 'text-emerald-400' :
                                    compositeScore <= 55 ? 'text-dark-200' :
                                        compositeScore <= 70 ? 'text-amber-400' :
                                            'text-red-400'
                            }`}>
                            {compositeScore}
                        </span>
                        <span className="text-[10px] text-dark-600 mt-0.5">/ 100</span>
                    </div>

                    {/* 시그널 카드 */}
                    <div className={`flex-1 rounded-xl border px-4 py-3 ${getActionColor()}`}>
                        <div className="flex items-center gap-2 mb-1">
                            {getActionIcon()}
                            <span className="font-bold text-sm">{level.emoji} {level.label} — {level.action}</span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-80">{level.actionDetail}</p>
                    </div>
                </div>

                {/* AI 추천 보정 수치 */}
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                        <p className="text-[10px] text-blue-300/70 mb-0.5">AI 5점 종목 → 매수 강도</p>
                        <p className="text-lg font-black text-blue-400">{adjustment.example5pt}<span className="text-xs font-normal text-blue-400/60">/5.0</span></p>
                        <p className="text-[10px] text-dark-600 mt-0.5">매수 비중 ×{(adjustment.buyWeight * 100).toFixed(0)}%</p>
                    </div>
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                        <p className="text-[10px] text-red-300/70 mb-0.5">AI 3점 종목 → 매수 강도</p>
                        <p className="text-lg font-black text-red-400">{adjustment.example3pt}<span className="text-xs font-normal text-red-400/60">/3.0</span></p>
                        <p className="text-[10px] text-dark-600 mt-0.5">매도 비중 ×{(adjustment.sellWeight * 100).toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            {/* 상세 토글 */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-dark-800/40 hover:bg-dark-800/70 transition-colors border-t border-dark-800"
            >
                <span className="text-xs font-medium text-dark-500">{expanded ? '상세 지표 닫기' : '상세 지표 보기'}</span>
                {expanded ? <ChevronUp className="w-3.5 h-3.5 text-dark-500" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-500" />}
            </button>

            {/* 상세 패널 */}
            {expanded && (
                <div className="p-5 sm:p-6 border-t border-dark-800 space-y-4">
                    {/* 주요 지수 현황 */}
                    <div>
                        <h4 className="text-sm font-semibold text-dark-300 mb-3">📊 주요 시장 지수</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {indices.kospi && (
                                <IndexCard name="KOSPI" price={indices.kospi.price.toLocaleString()} change={indices.kospi.changePercent} />
                            )}
                            {indices.kosdaq && (
                                <IndexCard name="KOSDAQ" price={indices.kosdaq.price.toLocaleString()} change={indices.kosdaq.changePercent} />
                            )}
                            {indices.sp500 && (
                                <IndexCard name={indices.sp500.name || 'S&P 500'} price={indices.sp500.price.toLocaleString()} change={indices.sp500.changePercent} />
                            )}
                            {indices.nasdaq && (
                                <IndexCard name={indices.nasdaq.name || 'NASDAQ'} price={indices.nasdaq.price.toLocaleString()} change={indices.nasdaq.changePercent} />
                            )}
                            {indices.vix && (
                                <IndexCard name="VIX 공포지수" price={indices.vix.price.toFixed(2)} change={indices.vix.changePercent} invertColor />
                            )}
                            {indices.usdkrw && (
                                <IndexCard name="USD/KRW" price={`${indices.usdkrw.rate.toLocaleString()}원`} change={indices.usdkrw.changePercent} invertColor />
                            )}
                        </div>
                    </div>

                    {/* 세부 센티먼트 점수 */}
                    <div>
                        <h4 className="text-sm font-semibold text-dark-300 mb-3">📈 지표별 센티먼트 점수</h4>
                        <div className="space-y-2">
                            {indicators.map((ind) => (
                                <div key={ind.name} className="flex items-center gap-3">
                                    <span className="text-xs text-dark-400 w-28 shrink-0 truncate">{ind.name}</span>
                                    <div className="flex-1 h-2 rounded-full bg-dark-800 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${ind.score <= 30 ? 'from-blue-600 to-blue-400' :
                                                    ind.score <= 50 ? 'from-emerald-600 to-emerald-400' :
                                                        ind.score <= 70 ? 'from-yellow-500 to-amber-400' :
                                                            'from-red-600 to-red-400'
                                                }`}
                                            style={{ width: `${ind.score}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold w-8 text-right tabular-nums ${ind.score <= 30 ? 'text-blue-400' :
                                            ind.score <= 50 ? 'text-emerald-400' :
                                                ind.score <= 70 ? 'text-amber-400' :
                                                    'text-red-400'
                                        }`}>
                                        {ind.score}
                                    </span>
                                    <span className="text-[10px] text-dark-600 w-8 text-right">{(ind.weight * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 보정 설명 */}
                    <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
                        <p className="text-[11px] text-dark-500 leading-relaxed">
                            💡 <strong className="text-dark-400">시장 보정 공식:</strong> {adjustment.description}.
                            현재 시장 상태에서는 AI 추천 5점 종목도 매수 강도가 <strong className="text-dark-300">{adjustment.example5pt}</strong>로 조정됩니다.
                            {adjustment.buyWeight < 0.5 && ' 시장 과열 구간이므로 매수를 줄이고 이익 실현을 고려하세요.'}
                            {adjustment.buyWeight >= 0.8 && ' 시장 저평가 구간이므로 적극적인 매수를 고려할 수 있습니다.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// 지수 카드 서브 컴포넌트
function IndexCard({ name, price, change, invertColor }: { name: string; price: string; change: number; invertColor?: boolean }) {
    const isPositive = invertColor ? change < 0 : change >= 0;
    const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';
    const changeBg = isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10';

    return (
        <div className={`rounded-lg p-2.5 ${changeBg} border border-dark-700/30`}>
            <p className="text-[10px] text-dark-500 mb-0.5 truncate">{name}</p>
            <p className="text-sm font-bold text-dark-200 truncate">{price}</p>
            <p className={`text-xs font-semibold ${changeColor}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </p>
        </div>
    );
}
