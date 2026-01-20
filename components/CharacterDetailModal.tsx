'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CharacterInfo, CHARACTERS, DEBATE_DYNAMICS } from '@/lib/characters';

interface CharacterDetailModalProps {
  character: CharacterInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CharacterDetailModal({ character, isOpen, onClose }: CharacterDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'worldview' | 'debate'>('profile');

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset tab when modal closes or character changes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
    }
  }, [isOpen, character]);

  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Character Detail View */}
        <div className="max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-dark-800/80 hover:bg-dark-700 transition-colors z-10"
            >
              <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header with gradient background */}
            <div className={`relative p-8 pb-24 bg-gradient-to-br ${character.gradient} overflow-hidden`}>
              <div className="absolute inset-0 bg-dark-950/30" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
              
              <div className="relative flex items-start gap-6">
                {/* Character Image */}
                <div className="flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden bg-white/10 ring-4 ring-white/20 shadow-xl">
                  <Image
                    src={character.image}
                    alt={character.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Basic Info */}
                <div className="flex-1 pt-2">
                  <h2 className="text-2xl font-bold text-white mb-1">{character.name}</h2>
                  <p className="text-white/80 text-sm mb-1">{character.nameKo}</p>
                  <p className="text-white/60 text-sm mb-3">{character.roleKo}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {character.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="relative -mt-12 mx-6">
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-dark-800 border border-dark-700 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-dark-100">{character.accuracy}%</div>
                  <div className="text-xs text-dark-500">적중률</div>
                </div>
                <div className="text-center border-x border-dark-700">
                  <div className="text-2xl font-bold text-dark-100">{character.totalAnalyses.toLocaleString()}</div>
                  <div className="text-xs text-dark-500">총 분석</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-dark-100">{character.experience.split(' ')[0]}</div>
                  <div className="text-xs text-dark-500">경력</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 pt-6">
              <div className="flex gap-1 p-1 bg-dark-800 rounded-xl">
                {[
                  { id: 'profile', label: '프로필', icon: '👤' },
                  { id: 'worldview', label: '세계관', icon: '🌍' },
                  { id: 'debate', label: '토론 스타일', icon: '⚔️' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${character.gradient} text-white shadow-lg`
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {activeTab === 'profile' && (
                <>
                  {/* Catchphrase */}
                  <div className={`p-4 rounded-xl ${character.bgColor} border ${character.borderColor}`}>
                    <p className={`text-lg font-medium italic ${character.color}`}>{character.catchphrase}</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">소개</h3>
                    <p className="text-dark-300 leading-relaxed whitespace-pre-line">{character.fullBio}</p>
                  </div>

                  {/* Analysis Style */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">분석 스타일</h3>
                    <p className="text-dark-300 leading-relaxed">{character.analysisStyle}</p>
                  </div>

                  {/* Signature Phrases */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">자주 쓰는 말</h3>
                    <div className="flex flex-wrap gap-2">
                      {character.signaturePhrases.map((phrase, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-full bg-dark-800 border ${character.borderColor} text-sm text-dark-300`}
                        >
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Two columns for Strengths and Focus Areas */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div>
                      <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">강점</h3>
                      <ul className="space-y-2">
                        {character.strengths.map((strength, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                            <svg className={`w-4 h-4 ${character.color} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Focus Areas */}
                    <div>
                      <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">집중 분야</h3>
                      <ul className="space-y-2">
                        {character.focusAreas.map((area, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                            <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${character.gradient}`} />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'worldview' && (
                <>
                  {/* Education & Career */}
                  <div className={`p-5 rounded-xl ${character.bgColor} border ${character.borderColor}`}>
                    <h3 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
                      <span>🎓</span> 학력 & 경력
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs font-medium text-dark-500 uppercase">Education</span>
                        <p className="text-dark-200 mt-1">{character.background.education}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-dark-500 uppercase">Career</span>
                        <div className="mt-2 space-y-2">
                          {character.background.career.map((job, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${character.gradient}`} />
                              <span className="text-dark-300 text-sm">{job}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Philosophy */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">투자 철학</h3>
                    <div className="p-4 rounded-xl bg-dark-800 border border-dark-700">
                      <p className="text-dark-300 leading-relaxed italic">&ldquo;{character.background.philosophy}&rdquo;</p>
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">성격 특성</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {character.personality.traits.map((trait, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${character.gradient} text-white text-sm font-medium`}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-dark-500">말투</span>
                        <p className="text-dark-300 text-sm mt-1">{character.personality.speakingStyle}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'debate' && (
                <>
                  {/* Debate Style */}
                  <div className={`p-5 rounded-xl ${character.bgColor} border ${character.borderColor}`}>
                    <h3 className="font-bold text-dark-100 mb-3 flex items-center gap-2">
                      <span>🎯</span> 토론 포지션
                    </h3>
                    <p className="text-dark-300 leading-relaxed">{character.personality.debateStyle}</p>
                  </div>

                  {/* Debate Dynamics */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-4">다른 애널리스트와의 관계</h3>
                    <div className="space-y-4">
                      {character.id === 'claude' && (
                        <>
                          <DebateDynamicCard
                            opponent={CHARACTERS.gemini}
                            dynamic={DEBATE_DYNAMICS.claudeVsGemini}
                            myArgument={DEBATE_DYNAMICS.claudeVsGemini.claudeArgument}
                            opponentArgument={DEBATE_DYNAMICS.claudeVsGemini.geminiArgument}
                          />
                          <DebateDynamicCard
                            opponent={CHARACTERS.gpt}
                            dynamic={DEBATE_DYNAMICS.claudeVsGpt}
                            myArgument={DEBATE_DYNAMICS.claudeVsGpt.claudeArgument}
                            opponentArgument={DEBATE_DYNAMICS.claudeVsGpt.gptArgument}
                          />
                        </>
                      )}
                      {character.id === 'gemini' && (
                        <>
                          <DebateDynamicCard
                            opponent={CHARACTERS.claude}
                            dynamic={DEBATE_DYNAMICS.claudeVsGemini}
                            myArgument={DEBATE_DYNAMICS.claudeVsGemini.geminiArgument}
                            opponentArgument={DEBATE_DYNAMICS.claudeVsGemini.claudeArgument}
                          />
                          <DebateDynamicCard
                            opponent={CHARACTERS.gpt}
                            dynamic={DEBATE_DYNAMICS.geminiVsGpt}
                            myArgument={DEBATE_DYNAMICS.geminiVsGpt.geminiArgument}
                            opponentArgument={DEBATE_DYNAMICS.geminiVsGpt.gptArgument}
                          />
                        </>
                      )}
                      {character.id === 'gpt' && (
                        <>
                          <DebateDynamicCard
                            opponent={CHARACTERS.claude}
                            dynamic={DEBATE_DYNAMICS.claudeVsGpt}
                            myArgument={DEBATE_DYNAMICS.claudeVsGpt.gptArgument}
                            opponentArgument={DEBATE_DYNAMICS.claudeVsGpt.claudeArgument}
                          />
                          <DebateDynamicCard
                            opponent={CHARACTERS.gemini}
                            dynamic={DEBATE_DYNAMICS.geminiVsGpt}
                            myArgument={DEBATE_DYNAMICS.geminiVsGpt.gptArgument}
                            opponentArgument={DEBATE_DYNAMICS.geminiVsGpt.geminiArgument}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

// Debate Dynamic Card Component
function DebateDynamicCard({
  opponent,
  dynamic,
  myArgument,
  opponentArgument,
}: {
  opponent: CharacterInfo;
  dynamic: { tension: string };
  myArgument: string;
  opponentArgument: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-dark-800 border border-dark-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-dark-600">
          <Image
            src={opponent.image}
            alt={opponent.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="font-medium text-dark-200">vs {opponent.nameKo}</p>
          <p className={`text-xs ${opponent.color}`}>{dynamic.tension}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="p-2 rounded-lg bg-dark-700/50">
          <span className="text-dark-500">나: </span>
          <span className="text-dark-300">&ldquo;{myArgument}&rdquo;</span>
        </div>
        <div className={`p-2 rounded-lg ${opponent.bgColor}`}>
          <span className={`${opponent.color}`}>{opponent.nameKo}: </span>
          <span className="text-dark-300">&ldquo;{opponentArgument}&rdquo;</span>
        </div>
      </div>
    </div>
  );
}
