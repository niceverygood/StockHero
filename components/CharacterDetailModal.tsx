'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CharacterInfo, CHARACTERS } from '@/lib/characters';
import { AIConsultation } from './AIConsultation';
import type { CharacterType } from '@/lib/llm/types';

interface Holding {
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

interface CharacterDetailModalProps {
  character: CharacterInfo | null;
  isOpen: boolean;
  onClose: () => void;
  holdings?: Holding[];
  onViewDebate?: () => void;
}

export function CharacterDetailModal({ character, isOpen, onClose, holdings = [], onViewDebate }: CharacterDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showConsultation, setShowConsultation] = useState(false);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showConsultation) {
          setShowConsultation(false);
        } else {
          onClose();
        }
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (showConsultation) {
          setShowConsultation(false);
        } else {
          onClose();
        }
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
  }, [isOpen, onClose, showConsultation]);

  // Reset consultation view when modal closes or character changes
  useEffect(() => {
    if (!isOpen) {
      setShowConsultation(false);
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
        {showConsultation ? (
          /* Consultation View */
          <AIConsultation
            characterType={character.id as CharacterType}
            holdings={holdings}
            onClose={() => setShowConsultation(false)}
            onViewDebate={() => {
              setShowConsultation(false);
              onClose();
              onViewDebate?.();
            }}
          />
        ) : (
          /* Character Detail View */
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
                <div className="flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden bg-white/10 ring-4 ring-white/20">
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
                  <p className="text-white/60 text-sm mb-3">{character.role}</p>
                  
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

            {/* Consultation Button */}
            <div className="px-6 pt-6">
              <button
                onClick={() => setShowConsultation(true)}
                className={`w-full py-5 px-6 rounded-2xl bg-gradient-to-r ${character.gradient} text-white font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 shadow-xl ring-2 ring-white/20 animate-pulse-slow`}
                style={{
                  boxShadow: `0 8px 32px rgba(99, 102, 241, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)`
                }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                💬 {character.name}에게 보유종목 상담받기
                {holdings.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/30 text-sm font-medium">
                    {holdings.length}종목 연동
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Catchphrase */}
              <div className={`p-4 rounded-xl ${character.bgColor} border border-current/10`}>
                <p className={`text-sm italic ${character.color}`}>{character.catchphrase}</p>
              </div>

              {/* Bio */}
              <div>
                <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">About</h3>
                <p className="text-dark-300 leading-relaxed">{character.fullBio}</p>
              </div>

              {/* Analysis Style */}
              <div>
                <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Analysis Style</h3>
                <p className="text-dark-300 leading-relaxed">{character.analysisStyle}</p>
              </div>

              {/* Two columns for Strengths and Focus Areas */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div>
                  <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Strengths</h3>
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
                  <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Focus Areas</h3>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
