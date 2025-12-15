import Link from 'next/link';
import clsx from 'clsx';
import type { Top5Item } from '@/lib/types';

interface VerdictCardProps {
  rank: number;
  item: Top5Item;
  showRationale?: boolean;
}

export function VerdictCard({ rank, item, showRationale = true }: VerdictCardProps) {
  const getRankStyle = (r: number) => {
    switch (r) {
      case 1:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20';
      case 2:
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
      default:
        return 'bg-surface-700 text-surface-300';
    }
  };

  return (
    <Link href={`/battle/${item.symbol}`}>
      <div className="card card-hover group cursor-pointer">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
              getRankStyle(rank)
            )}
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">
                {item.name}
              </span>
              <span className="text-sm text-surface-500">{item.symbol}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-surface-400">
                합의 점수: <span className="font-semibold text-primary-400">{item.avgScore.toFixed(1)}</span>
              </span>
            </div>
            {showRationale && item.rationale && (
              <p className="mt-2 text-sm text-surface-400 line-clamp-2">
                {item.rationale}
              </p>
            )}
          </div>
          <div className="text-surface-600 group-hover:text-primary-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-surface-700 text-xs text-surface-500">
          토론 세부 내용을 보려면 클릭하세요
        </div>
      </div>
    </Link>
  );
}

interface VerdictListProps {
  items: Top5Item[];
  title?: string;
  date?: string;
}

export function VerdictList({ items, title, date }: VerdictListProps) {
  return (
    <div className="space-y-4">
      {(title || date) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
          {date && <span className="text-sm text-surface-500">{date}</span>}
        </div>
      )}
      {items.map((item, index) => (
        <VerdictCard key={item.symbolId} rank={index + 1} item={item} />
      ))}
    </div>
  );
}
