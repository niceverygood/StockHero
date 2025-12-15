import clsx from 'clsx';
import type { CharacterRole } from '@/lib/types';

interface CharacterBadgeProps {
  role: CharacterRole;
  size?: 'sm' | 'md' | 'lg';
}

const CHARACTER_INFO: Record<CharacterRole, { name: string; title: string; color: string; bg: string }> = {
  CLAUDE: {
    name: 'Claude Lee',
    title: '균형 분석가',
    color: 'text-claude',
    bg: 'bg-claude/20',
  },
  GEMINI: {
    name: 'Gemi Nine',
    title: '혁신 전략가',
    color: 'text-gemini',
    bg: 'bg-gemini/20',
  },
  GPT: {
    name: 'G.P. Taylor',
    title: '거시/리스크 총괄',
    color: 'text-gpt',
    bg: 'bg-gpt/20',
  },
  SYSTEM: {
    name: 'System',
    title: '시스템',
    color: 'text-surface-400',
    bg: 'bg-surface-700',
  },
};

export function CharacterBadge({ role, size = 'md' }: CharacterBadgeProps) {
  const info = CHARACTER_INFO[role];

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          'rounded-full flex items-center justify-center font-bold',
          info.bg,
          info.color,
          size === 'sm' && 'w-6 h-6 text-xs',
          size === 'md' && 'w-8 h-8 text-sm',
          size === 'lg' && 'w-10 h-10 text-base'
        )}
      >
        {role === 'SYSTEM' ? 'S' : role[0]}
      </div>
      <div className="flex flex-col">
        <span
          className={clsx(
            'font-semibold',
            info.color,
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {info.name}
        </span>
        {size !== 'sm' && (
          <span className="text-xs text-surface-500">{info.title}</span>
        )}
      </div>
    </div>
  );
}

export function getCharacterColor(role: CharacterRole): string {
  return CHARACTER_INFO[role].color;
}

export function getCharacterBg(role: CharacterRole): string {
  return CHARACTER_INFO[role].bg;
}
