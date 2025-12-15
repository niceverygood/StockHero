'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DisclaimerBar, Header, SkeletonCard, AdSlot } from '@/components';

interface Metrics {
  totalPredictions: number;
  evaluatedPredictions: number;
  hits: number;
  hitRate: number;
  avgConfidence: number;
  byDirection: {
    up: { total: number; hits: number; hitRate: number };
    down: { total: number; hits: number; hitRate: number };
    neutral: { total: number; hits: number; hitRate: number };
  };
}

const MOCK_HISTORY = [
  { date: 'Dec 13, 2024', top5: ['삼성전자', 'SK하이닉스', 'LG에너지솔루션', '카카오', '셀트리온'] },
  { date: 'Dec 12, 2024', top5: ['현대차', 'NAVER', '삼성SDI', 'KB금융', '포스코홀딩스'] },
  { date: 'Dec 11, 2024', top5: ['삼성전자', 'LG화학', '기아', '신한지주', 'SK텔레콤'] },
  { date: 'Dec 10, 2024', top5: ['SK하이닉스', '삼성바이오로직스', 'KT', '현대모비스', 'LG전자'] },
];

function CircularProgress({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 60 ? 'text-emerald-500' : value >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-dark-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          className={color}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-dark-100">{value}%</span>
        <span className="text-xs text-dark-500">Hit Rate</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="card text-center">
      <div className="text-3xl font-bold text-dark-100 mb-1">{value}</div>
      <div className="text-sm text-dark-500">{label}</div>
      {subtext && <div className="text-xs text-dark-600 mt-1">{subtext}</div>}
    </div>
  );
}

function DirectionBar({ label, hits, total }: { label: string; hits: number; total: number }) {
  const percentage = total > 0 ? (hits / total) * 100 : 0;
  const color = percentage >= 60 ? 'from-emerald-500 to-emerald-400' : percentage >= 40 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-dark-400">{label}</span>
        <span className="font-medium text-dark-200">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-dark-500 text-right">{hits} / {total}</div>
    </div>
  );
}

function ArchiveContent() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/archive/metrics?range=${range}`);
        const data = await res.json();
        if (data.success) {
          setMetrics(data.data.metrics);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [range]);

  if (loading || !metrics) {
    return (
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  const hitRatePercent = Math.round(metrics.hitRate * 100);

  return (
    <div className="space-y-8">
      {/* Range Toggle */}
      <div className="flex items-center gap-2 p-1 bg-dark-900 rounded-xl w-fit">
        {(['7d', '30d'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              range === r
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Stats */}
          <div className="card">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <CircularProgress value={hitRatePercent} size={140} />
              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-2xl font-bold text-dark-100">{metrics.evaluatedPredictions}</div>
                  <div className="text-sm text-dark-500">Evaluated</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-100">{metrics.hits}</div>
                  <div className="text-sm text-dark-500">Hits</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-100">{(metrics.avgConfidence * 100).toFixed(0)}%</div>
                  <div className="text-sm text-dark-500">Avg Confidence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-dark-100">{metrics.totalPredictions - metrics.evaluatedPredictions}</div>
                  <div className="text-sm text-dark-500">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Direction Breakdown */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-6">Accuracy by Direction</h3>
            <div className="space-y-6">
              <DirectionBar label="Bullish Predictions" hits={metrics.byDirection.up.hits} total={metrics.byDirection.up.total} />
              <DirectionBar label="Bearish Predictions" hits={metrics.byDirection.down.hits} total={metrics.byDirection.down.total} />
              <DirectionBar label="Neutral Predictions" hits={metrics.byDirection.neutral.hits} total={metrics.byDirection.neutral.total} />
            </div>
          </div>

          {/* History */}
          <div className="card">
            <h3 className="font-semibold text-dark-100 mb-6">Recent Verdicts</h3>
            <div className="space-y-3">
              {MOCK_HISTORY.map((item) => (
                <Link
                  key={item.date}
                  href={`/verdict?date=${item.date}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 hover:bg-dark-800 border border-dark-800 hover:border-dark-700 transition-all group"
                >
                  <div>
                    <div className="font-medium text-dark-200 group-hover:text-white transition-colors">{item.date}</div>
                    <div className="text-sm text-dark-500 mt-1">{item.top5.slice(0, 3).join(', ')}...</div>
                  </div>
                  <svg className="w-5 h-5 text-dark-600 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <AdSlot variant="sidebar" />

          <div className="card">
            <h4 className="font-semibold text-dark-100 mb-4">Methodology</h4>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-dark-300 font-medium mb-1">Direction Match</div>
                <div className="text-dark-500">5영업일 후 예측 방향과 실제 등락 일치 여부</div>
              </div>
              <div>
                <div className="text-dark-300 font-medium mb-1">Evaluation Period</div>
                <div className="text-dark-500">예측 후 5영업일 경과 시 자동 평가</div>
              </div>
            </div>
          </div>

          <div className="card border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-400 text-sm mb-1">Disclaimer</h4>
                <p className="text-xs text-dark-400 leading-relaxed">
                  Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-32 pb-16">
        <div className="container-app">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-dark-50 mb-3">Performance Archive</h1>
            <p className="text-dark-400">
              과거 예측의 적중률을 투명하게 공개합니다
            </p>
          </div>

          <ArchiveContent />
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
