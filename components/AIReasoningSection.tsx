'use client';

import { Crown, MessageSquare } from 'lucide-react';

interface AIReasoningSectionProps {
  reasoning: {
    claude?: string;
    gemini?: string;
    gpt?: string;
  };
  isUnlocked: boolean;
  onUpgradeClick: () => void;
}

export function AIReasoningSection({ reasoning, isUnlocked, onUpgradeClick }: AIReasoningSectionProps) {
  if (!isUnlocked) {
    return (
      <div 
        className="relative bg-dark-800/50 border border-dark-700 rounded-xl p-6 cursor-pointer group hover:border-amber-500/30 transition-all"
        onClick={onUpgradeClick}
      >
        {/* 블러된 가짜 내용 */}
        <div className="blur-sm select-none pointer-events-none">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            AI 토론 내용
          </h3>
          <div className="space-y-4">
            {/* Claude 가짜 박스 */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-500" />
                <span className="text-purple-400 font-medium">Claude Lee</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-dark-700 rounded" />
                <div className="h-4 w-4/5 bg-dark-700 rounded" />
                <div className="h-4 w-3/4 bg-dark-700 rounded" />
              </div>
            </div>
            
            {/* Gemini 가짜 박스 */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500" />
                <span className="text-blue-400 font-medium">Gemi Nine</span>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-dark-700 rounded" />
                <div className="h-4 w-5/6 bg-dark-700 rounded" />
              </div>
            </div>
          </div>
        </div>
        
        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 bg-dark-900/70 rounded-xl flex flex-col items-center justify-center backdrop-blur-[2px]">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <span className="font-bold text-lg">Pro 전용 콘텐츠</span>
          <span className="text-sm text-dark-400 mt-1 text-center px-4">
            AI가 왜 이 종목을 선택했는지<br />상세한 분석을 확인하세요
          </span>
          <button className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-medium rounded-lg hover:opacity-90 transition-opacity">
            Pro로 업그레이드
          </button>
        </div>
      </div>
    );
  }

  // Pro 회원용 실제 내용
  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-6">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-brand-400" />
        AI 토론 내용
        <span className="ml-auto text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
          Pro
        </span>
      </h3>
      
      <div className="space-y-4">
        {reasoning.claude && (
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-xs font-bold">
                C
              </div>
              <span className="text-purple-400 font-medium">Claude Lee</span>
            </div>
            <p className="text-sm text-dark-200 whitespace-pre-wrap">{reasoning.claude}</p>
          </div>
        )}
        
        {reasoning.gemini && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-xs font-bold">
                G
              </div>
              <span className="text-blue-400 font-medium">Gemi Nine</span>
            </div>
            <p className="text-sm text-dark-200 whitespace-pre-wrap">{reasoning.gemini}</p>
          </div>
        )}
        
        {reasoning.gpt && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-xs font-bold">
                T
              </div>
              <span className="text-emerald-400 font-medium">G.P. Taylor</span>
            </div>
            <p className="text-sm text-dark-200 whitespace-pre-wrap">{reasoning.gpt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
