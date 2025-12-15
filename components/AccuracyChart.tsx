'use client';

import clsx from 'clsx';

interface AccuracyChartProps {
  hitRate: number;
  total: number;
  hits: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AccuracyGauge({ hitRate, total, hits, label, size = 'md' }: AccuracyChartProps) {
  const percentage = Math.round(hitRate * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (hitRate * circumference);

  const sizes = {
    sm: { wrapper: 'w-24 h-24', text: 'text-lg', label: 'text-xs' },
    md: { wrapper: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
    lg: { wrapper: 'w-40 h-40', text: 'text-3xl', label: 'text-base' },
  };

  return (
    <div className="flex flex-col items-center">
      <div className={clsx('relative', sizes[size].wrapper)}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-surface-700"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={clsx(
              percentage >= 60 ? 'text-green-500' :
              percentage >= 40 ? 'text-yellow-500' :
              'text-red-500'
            )}
            style={{
              strokeDasharray: `${circumference}%`,
              strokeDashoffset: `${strokeDashoffset}%`,
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx('font-bold text-white', sizes[size].text)}>{percentage}%</span>
          <span className={clsx('text-surface-400', sizes[size].label)}>
            {hits}/{total}
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-2 text-sm text-surface-400 font-medium">{label}</span>
      )}
    </div>
  );
}

interface BarChartData {
  label: string;
  value: number;
  total: number;
}

interface AccuracyBarChartProps {
  data: BarChartData[];
  title?: string;
}

export function AccuracyBarChart({ data, title }: AccuracyBarChartProps) {
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="font-semibold text-white">{title}</h3>
      )}
      {data.map((item) => {
        const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">{item.label}</span>
              <span className="text-white font-medium">
                {Math.round(percentage)}% ({item.value}/{item.total})
              </span>
            </div>
            <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  percentage >= 60 ? 'bg-green-500' :
                  percentage >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
