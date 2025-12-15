'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { CharacterBadge, getCharacterBg } from './CharacterBadge';
import type { CharacterRole } from '@/lib/types';

interface MessageBubbleProps {
  role: CharacterRole;
  content: string;
  sources?: string[];
  risks?: string;
  score?: number;
  timestamp?: Date;
}

export function MessageBubble({
  role,
  content,
  sources = [],
  risks,
  score,
  timestamp,
}: MessageBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isSystem = role === 'SYSTEM';

  return (
    <div
      className={clsx(
        'animate-fade-in',
        isSystem && 'flex justify-center my-4'
      )}
    >
      {isSystem ? (
        <div className="bg-surface-800 text-surface-400 px-4 py-2 rounded-full text-sm border border-surface-700">
          {content}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-start gap-3">
            <CharacterBadge role={role} size="md" />
            {timestamp && (
              <span className="text-xs text-surface-500 mt-1">
                {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div
            className={clsx(
              'ml-10 p-4 rounded-2xl rounded-tl-sm max-w-[85%] border border-surface-700',
              getCharacterBg(role)
            )}
          >
            <p className="text-surface-200 leading-relaxed whitespace-pre-wrap">
              {content}
            </p>

            {(sources.length > 0 || risks || score !== undefined) && (
              <div className="mt-3 pt-3 border-t border-surface-600/50">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-primary-400 hover:text-primary-300 underline"
                >
                  {showDetails ? '분석 근거 접기' : '분석 근거 보기'}
                </button>

                {showDetails && (
                  <div className="mt-2 space-y-2 text-sm">
                    {score !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-surface-400">평가 점수:</span>
                        <span className="font-semibold text-primary-400">{score}/5</span>
                      </div>
                    )}
                    {risks && (
                      <div>
                        <span className="text-surface-400">리스크 요인: </span>
                        <span className="text-red-400">{risks}</span>
                      </div>
                    )}
                    {sources.length > 0 && (
                      <div>
                        <span className="text-surface-400">참고 자료: </span>
                        <span className="text-primary-400">{sources.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
