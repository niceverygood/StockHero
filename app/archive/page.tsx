'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DisclaimerBar, Header, CharacterAvatar } from '@/components';
import { CHARACTERS } from '@/lib/characters';
import {
  generatePortfolioHistory,
  generatePickPerformances,
  generateAIPerformances,
  generatePortfolioMetrics,
  generateHallOfFame,
  simulateInvestment,
  type TimeRange,
  type PortfolioSnapshot,
  type AIPerformance,
} from '@/lib/portfolio';

// Time range selector
function TimeRangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const options: { value: TimeRange; label: string }[] = [
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-dark-900 rounded-xl">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === opt.value
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Portfolio chart component
function PortfolioChart({ data }: { data: PortfolioSnapshot[] }) {
  if (data.length === 0) return null;

  const maxReturn = Math.max(...data.map(d => Math.max(d.returnPct, d.benchmarkReturnPct)));
  const minReturn = Math.min(...data.map(d => Math.min(d.returnPct, d.benchmarkReturnPct)));
  const range = maxReturn - minReturn || 1;
  
  const getY = (value: number) => {
    return 100 - ((value - minReturn) / range) * 100;
  };

  const portfolioPath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = getY(d.returnPct);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const benchmarkPath = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = getY(d.benchmarkReturnPct);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const latestReturn = data[data.length - 1]?.returnPct || 0;
  const latestBenchmark = data[data.length - 1]?.benchmarkReturnPct || 0;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-sm text-dark-300">StockHero Portfolio</span>
          <span className={`text-sm font-semibold ${latestReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {latestReturn >= 0 ? '+' : ''}{latestReturn.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-dark-500" />
          <span className="text-sm text-dark-300">KOSPI</span>
          <span className={`text-sm font-semibold ${latestBenchmark >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {latestBenchmark >= 0 ? '+' : ''}{latestBenchmark.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64 bg-dark-900/50 rounded-xl p-4">
        {/* Grid lines */}
        <div className="absolute inset-4 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-dark-800/50" />
          ))}
        </div>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between text-xs text-dark-500 -translate-x-full pr-2">
          <span>{maxReturn.toFixed(0)}%</span>
          <span>{((maxReturn + minReturn) / 2).toFixed(0)}%</span>
          <span>{minReturn.toFixed(0)}%</span>
        </div>

        {/* SVG Chart */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Zero line */}
          <line
            x1="0"
            y1={getY(0)}
            x2="100"
            y2={getY(0)}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-dark-600"
            strokeDasharray="2,2"
          />
          
          {/* Benchmark line */}
          <path
            d={benchmarkPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-dark-500"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Portfolio line */}
          <path
            d={portfolioPath}
            fill="none"
            stroke="url(#portfolioGradient)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Gradient fill under portfolio line */}
          <path
            d={`${portfolioPath} L 100 100 L 0 100 Z`}
            fill="url(#areaGradient)"
            opacity="0.3"
          />
          
          <defs>
            <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Date labels */}
        <div className="absolute left-4 right-4 bottom-0 translate-y-full pt-2 flex justify-between text-xs text-dark-500">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}

// Metrics card
function MetricCard({ label, value, subtext, trend }: { 
  label: string; 
  value: string; 
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-dark-300';
  
  return (
    <div className="bg-dark-800/50 rounded-xl p-4">
      <div className="text-xs text-dark-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${trendColor}`}>{value}</div>
      {subtext && <div className="text-xs text-dark-500 mt-1">{subtext}</div>}
    </div>
  );
}

// AI Leaderboard
function AILeaderboard({ performances }: { performances: AIPerformance[] }) {
  return (
    <div className="space-y-3">
      {performances.map((ai, index) => {
        const char = CHARACTERS[ai.id];
        return (
          <div 
            key={ai.id}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              index === 0 
                ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20' 
                : 'bg-dark-800/50'
            }`}
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              index === 0 ? 'bg-amber-500 text-white' :
              index === 1 ? 'bg-dark-400 text-white' :
              'bg-dark-700 text-dark-400'
            }`}>
              {index + 1}
            </div>
            
            {/* Avatar */}
            <CharacterAvatar character={ai.id} size="md" />
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-dark-100">{ai.name}</span>
                {ai.streak >= 3 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">
                    {ai.streak} streak
                  </span>
                )}
              </div>
              <div className="text-xs text-dark-500">
                {ai.totalPicks} picks | Best: {ai.bestSector}
              </div>
            </div>
            
            {/* Stats */}
            <div className="text-right">
              <div className={`text-lg font-bold ${ai.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ai.totalReturn >= 0 ? '+' : ''}{ai.totalReturn.toFixed(1)}%
              </div>
              <div className="text-xs text-dark-500">Win {ai.winRate.toFixed(0)}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Investment Simulator
function InvestmentSimulator({ range }: { range: TimeRange }) {
  const [amount, setAmount] = useState(10000000);
  const result = useMemo(() => simulateInvestment(amount, range), [amount, range]);
  
  const presets = [1000000, 5000000, 10000000, 50000000, 100000000];
  
  return (
    <div className="card">
      <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Investment Simulator
      </h3>
      
      <div className="mb-4">
        <label className="text-xs text-dark-500 block mb-2">Initial Investment</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                amount === preset
                  ? 'bg-brand-600 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              {(preset / 10000).toLocaleString()}만원
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-xl">
        <div>
          <div className="text-xs text-dark-500 mb-1">StockHero 포트폴리오</div>
          <div className="text-xl font-bold text-dark-100">
            {result.finalValue.toLocaleString()}원
          </div>
          <div className={`text-sm ${result.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.profit >= 0 ? '+' : ''}{result.profit.toLocaleString()}원 ({result.returnPct.toFixed(1)}%)
          </div>
        </div>
        <div>
          <div className="text-xs text-dark-500 mb-1">KOSPI (비교)</div>
          <div className="text-xl font-bold text-dark-400">
            {result.benchmarkFinal.toLocaleString()}원
          </div>
          <div className="text-sm text-dark-500">
            {result.benchmarkProfit >= 0 ? '+' : ''}{result.benchmarkProfit.toLocaleString()}원
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <div className="text-xs text-emerald-400">
          Alpha (초과수익): +{(result.returnPct - (result.benchmarkProfit / amount * 100)).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

// Hall of Fame
function HallOfFame() {
  const hallOfFame = generateHallOfFame();
  
  return (
    <div className="card">
      <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Hall of Fame
      </h3>
      
      <div className="space-y-2">
        {hallOfFame.map((entry) => (
          <Link
            key={entry.symbol}
            href={`/battle/${entry.symbol}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-all group"
          >
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
              entry.rank === 1 ? 'bg-amber-500 text-white' :
              entry.rank === 2 ? 'bg-dark-400 text-white' :
              entry.rank === 3 ? 'bg-orange-700 text-white' :
              'bg-dark-700 text-dark-400'
            }`}>
              {entry.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-dark-200 group-hover:text-white transition-colors truncate">
                {entry.name}
              </div>
              <div className="text-xs text-dark-500">{entry.date}</div>
            </div>
            <div className="flex items-center gap-1">
              {entry.pickedBy.map((ai) => (
                <div key={ai} className="w-5 h-5 rounded-full overflow-hidden">
                  <CharacterAvatar character={ai} size="sm" />
                </div>
              ))}
            </div>
            <div className="text-emerald-400 font-bold">+{entry.returnPct}%</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Recent picks table
function RecentPicks({ range }: { range: TimeRange }) {
  const picks = generatePickPerformances(range);
  
  return (
    <div className="card">
      <h3 className="font-semibold text-dark-100 mb-4">Recent Picks Performance</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-dark-500 border-b border-dark-800">
              <th className="pb-3 font-medium">Stock</th>
              <th className="pb-3 font-medium">Entry</th>
              <th className="pb-3 font-medium">Current</th>
              <th className="pb-3 font-medium">Return</th>
              <th className="pb-3 font-medium">Picked By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/50">
            {picks.slice(0, 10).map((pick) => (
              <tr key={pick.symbol} className="group">
                <td className="py-3">
                  <Link href={`/battle/${pick.symbol}`} className="hover:text-brand-400 transition-colors">
                    <div className="font-medium text-dark-200 group-hover:text-white">{pick.name}</div>
                    <div className="text-xs text-dark-500">{pick.symbol}</div>
                  </Link>
                </td>
                <td className="py-3 text-sm text-dark-400">
                  {pick.entryPrice.toLocaleString()}원
                  <div className="text-xs text-dark-600">{pick.entryDate}</div>
                </td>
                <td className="py-3 text-sm text-dark-300">
                  {pick.currentPrice.toLocaleString()}원
                </td>
                <td className="py-3">
                  <span className={`text-sm font-semibold ${pick.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pick.returnPct >= 0 ? '+' : ''}{pick.returnPct}%
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {pick.pickedBy.map((ai) => (
                      <div key={ai} className="w-6 h-6 rounded-full overflow-hidden">
                        <CharacterAvatar character={ai} size="sm" />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const [range, setRange] = useState<TimeRange>('1m');
  
  const portfolioHistory = useMemo(() => generatePortfolioHistory(range), [range]);
  const aiPerformances = useMemo(() => generateAIPerformances(), []);
  const metrics = useMemo(() => generatePortfolioMetrics(range), [range]);

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-32 pb-16">
        <div className="container-app">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-dark-50 mb-2">Performance Archive</h1>
              <p className="text-dark-400">
                AI 포트폴리오의 실제 성과를 투명하게 공개합니다
              </p>
            </div>
            <TimeRangeSelector value={range} onChange={setRange} />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <MetricCard 
              label="Total Return" 
              value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`}
              trend={metrics.totalReturn >= 0 ? 'up' : 'down'}
            />
            <MetricCard 
              label="vs KOSPI (Alpha)" 
              value={`+${metrics.alpha.toFixed(1)}%`}
              trend="up"
            />
            <MetricCard 
              label="Win Rate" 
              value={`${metrics.winRate.toFixed(0)}%`}
              subtext={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
            />
            <MetricCard 
              label="Avg Win / Loss" 
              value={`${metrics.avgWin.toFixed(1)}%`}
              subtext={`/ ${metrics.avgLoss.toFixed(1)}%`}
              trend="up"
            />
            <MetricCard 
              label="Profit Factor" 
              value={metrics.profitFactor.toFixed(2)}
              trend={metrics.profitFactor > 1 ? 'up' : 'down'}
            />
            <MetricCard 
              label="Max Drawdown" 
              value={`${metrics.maxDrawdown.toFixed(1)}%`}
              trend="down"
            />
          </div>

          {/* Chart Section */}
          <div className="card mb-8">
            <h3 className="font-semibold text-dark-100 mb-6">Portfolio Performance vs Benchmark</h3>
            <PortfolioChart data={portfolioHistory} />
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Left Column - AI Leaderboard */}
            <div className="lg:col-span-2 space-y-8">
              <div className="card">
                <h3 className="font-semibold text-dark-100 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  AI Analyst Leaderboard
                </h3>
                <AILeaderboard performances={aiPerformances} />
              </div>
              
              <RecentPicks range={range} />
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              <InvestmentSimulator range={range} />
              <HallOfFame />
              
              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-400 text-sm mb-1">Performance Disclaimer</h4>
                    <p className="text-xs text-dark-400 leading-relaxed">
                      표시된 수익률은 가상의 백테스트 결과이며, 실제 투자 결과와 다를 수 있습니다.
                      과거 성과가 미래 수익을 보장하지 않습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
