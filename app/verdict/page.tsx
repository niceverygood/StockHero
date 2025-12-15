import { Suspense } from 'react';
import Link from 'next/link';
import { DisclaimerBar, Header, SkeletonList, AdSlot } from '@/components';
import type { Top5Item } from '@/lib/types';

async function getVerdict(): Promise<{
  top5: Top5Item[];
  rationale: string;
  date: string;
  unanimousCount: number;
}> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return {
    date: today,
    unanimousCount: 2,
    rationale: 'Top 5 중 2개 종목이 만장일치 합의를 얻었습니다. 반도체, 2차전지, IT서비스 업종에 대한 선호가 두드러집니다.',
    top5: [
      { rank: 1, symbolId: '1', symbol: '005930', name: '삼성전자', avgScore: 4.7, rationale: '세 분석가 모두 삼성전자에 대해 4점 이상의 긍정적 평가를 내렸습니다.' },
      { rank: 2, symbolId: '2', symbol: '000660', name: 'SK하이닉스', avgScore: 4.5, rationale: 'HBM 수요 증가에 따른 수혜가 예상됩니다.' },
      { rank: 3, symbolId: '3', symbol: '373220', name: 'LG에너지솔루션', avgScore: 4.3, rationale: '2차전지 업종 내 글로벌 경쟁력을 갖추고 있습니다.' },
      { rank: 4, symbolId: '7', symbol: '035720', name: '카카오', avgScore: 4.2, rationale: 'IT서비스 업종 내 플랫폼 경쟁력이 있습니다.' },
      { rank: 5, symbolId: '10', symbol: '068270', name: '셀트리온', avgScore: 4.1, rationale: '바이오시밀러 시장 점유율 확대가 긍정적입니다.' },
    ],
  };
}

function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, string> = {
    1: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30',
    2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
    3: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${styles[rank] || 'bg-dark-700 text-dark-300'}`}>
      {rank}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const percentage = (score / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-brand-400 w-8">{score.toFixed(1)}</span>
    </div>
  );
}

async function VerdictContent() {
  const verdict = await getVerdict();

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {verdict.top5.map((item, index) => (
          <Link key={item.symbolId} href={`/battle/${item.symbol}`}>
            <div className="card-interactive group">
              <div className="flex items-start gap-4">
                <RankBadge rank={index + 1} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-semibold text-dark-100 group-hover:text-white transition-colors">
                      {item.name}
                    </span>
                    <span className="text-sm text-dark-500 font-mono">{item.symbol}</span>
                    {index < 2 && (
                      <span className="badge-success text-2xs">Unanimous</span>
                    )}
                  </div>
                  <ScoreBar score={item.avgScore} />
                  <p className="mt-3 text-sm text-dark-400 line-clamp-1">
                    {item.rationale}
                  </p>
                </div>
                <div className="text-dark-600 group-hover:text-brand-400 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* Summary Card */}
        <div className="card mt-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-dark-100">Consensus Summary</h3>
          </div>
          <p className="text-dark-400 text-sm leading-relaxed mb-4">
            {verdict.rationale}
          </p>
          <div className="flex items-center gap-6 pt-4 border-t border-dark-800">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-dark-100">{verdict.unanimousCount}</span>
              <span className="text-sm text-dark-500">Unanimous</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-dark-100">20</span>
              <span className="text-sm text-dark-500">Candidates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <AdSlot variant="sidebar" />

        <div className="card">
          <h3 className="font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link href="/archive" className="btn-secondary w-full justify-start">
              View Performance History
            </Link>
            <button className="btn-outline w-full justify-start opacity-60 cursor-not-allowed">
              Connect Broker (Coming Soon)
            </button>
          </div>
        </div>

        <div className="card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-400 text-sm mb-1">Risk Notice</h4>
              <p className="text-xs text-dark-400 leading-relaxed">
                과거 적중률이 미래 수익을 보장하지 않습니다. 투자 판단의 책임은 본인에게 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerdictPage() {
  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-32 pb-16">
        <div className="container-app">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-dark-50">Today's Top 5</h1>
              <span className="badge-brand">Live</span>
            </div>
            <p className="text-dark-400">
              AI 3대장의 토론을 통해 도출된 오늘의 주목 종목
            </p>
          </div>

          <Suspense fallback={<SkeletonList count={5} />}>
            <VerdictContent />
          </Suspense>
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}
