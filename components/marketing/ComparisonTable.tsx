'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckIcon,
  XIcon,
  LockIcon,
  UnlockIcon,
  ArrowRightIcon,
  SparklesIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import Link from 'next/link';

interface ComparisonStock {
  name: string;
  symbol: string;
  freeInfo: {
    rank: string;
    analysis: string;
    targetPrice: string | null;
    targetDate: string | null;
    signal: string | null;
  };
  proInfo: {
    rank: string;
    analysis: string;
    targetPrice: string;
    targetDate: string;
    signal: string;
  };
}

interface ComparisonTableProps {
  variant?: 'table' | 'cards' | 'side-by-side';
  showCta?: boolean;
  onCtaClick?: () => void;
}

export function ComparisonTable({
  variant = 'side-by-side',
  showCta = true,
  onCtaClick,
}: ComparisonTableProps) {
  const [comparisonStock, setComparisonStock] = useState<ComparisonStock | null>(null);
  const [revealed, setRevealed] = useState(false);

  // 비교 데이터 로드
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const response = await fetch('/api/marketing/comparison-data');
        const data = await response.json();

        if (data.success && data.stock) {
          setComparisonStock(data.stock);
        } else {
          // 폴백 데이터
          setComparisonStock({
            name: '삼성전자',
            symbol: '005930',
            freeInfo: {
              rank: '1위',
              analysis: 'AI 3인 합의 추천',
              targetPrice: null,
              targetDate: null,
              signal: null,
            },
            proInfo: {
              rank: '1위',
              analysis: 'AI 3인 합의 추천. 반도체 업황 회복과 HBM 수요 증가로 실적 개선 기대. 외국인 순매수 지속.',
              targetPrice: '85,000원',
              targetDate: '3개월 내',
              signal: '매수 (RSI 35, 과매도 구간)',
            },
          });
        }
      } catch (error) {
        // 폴백 데이터 설정
        setComparisonStock({
          name: '삼성전자',
          symbol: '005930',
          freeInfo: {
            rank: '1위',
            analysis: 'AI 3인 합의 추천',
            targetPrice: null,
            targetDate: null,
            signal: null,
          },
          proInfo: {
            rank: '1위',
            analysis: 'AI 3인 합의 추천. 반도체 업황 회복과 HBM 수요 증가로 실적 개선 기대. 외국인 순매수 지속.',
            targetPrice: '85,000원',
            targetDate: '3개월 내',
            signal: '매수 (RSI 35, 과매도 구간)',
          },
        });
      }
    };

    fetchComparisonData();
  }, []);

  if (!comparisonStock) {
    return (
      <div className="bg-dark-800/50 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-dark-700 rounded mb-4" />
        <div className="h-40 w-full bg-dark-700 rounded" />
      </div>
    );
  }

  // 사이드 바이 사이드 스타일
  if (variant === 'side-by-side') {
    return (
      <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-dark-100 mb-2">
            무료 vs PRO, 실제 차이
          </h3>
          <p className="text-dark-400 text-sm">
            같은 종목에 대해 얼마나 다른 정보를 받을 수 있는지 비교해보세요
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-3 py-1 bg-dark-700 text-dark-300 text-sm rounded-full">
            예시: {comparisonStock.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 무료 정보 */}
          <div className="bg-dark-900/50 rounded-xl p-5 border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-dark-700 text-dark-300 text-sm font-medium rounded-full">
                무료 회원
              </span>
              <EyeOffIcon className="w-5 h-5 text-dark-500" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-dark-500 mb-1">순위</p>
                <p className="text-dark-200">{comparisonStock.freeInfo.rank}</p>
              </div>
              <div>
                <p className="text-xs text-dark-500 mb-1">분석</p>
                <p className="text-dark-200">{comparisonStock.freeInfo.analysis}</p>
              </div>
              <div className="pt-3 border-t border-dark-700">
                <div className="flex items-center gap-2 text-dark-500 mb-2">
                  <LockIcon className="w-4 h-4" />
                  <span className="text-sm">PRO 전용 정보</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <XIcon className="w-4 h-4 text-red-400" />
                    <span className="text-dark-500">목표가</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XIcon className="w-4 h-4 text-red-400" />
                    <span className="text-dark-500">달성 예상일</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XIcon className="w-4 h-4 text-red-400" />
                    <span className="text-dark-500">매매 시그널</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRO 정보 */}
          <div className="bg-gradient-to-br from-purple-500/10 to-dark-900/50 rounded-xl p-5 border border-purple-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm font-medium rounded-full flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  PRO 회원
                </span>
                <EyeIcon className="w-5 h-5 text-purple-400" />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-dark-500 mb-1">순위</p>
                  <p className="text-dark-200">{comparisonStock.proInfo.rank}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">분석</p>
                  <p className="text-dark-200">{comparisonStock.proInfo.analysis}</p>
                </div>
                <div className="pt-3 border-t border-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <UnlockIcon className="w-4 h-4" />
                    <span className="text-sm">PRO 전용 정보</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-green-400" />
                      <span className="text-dark-300">
                        목표가: <span className="text-green-400 font-medium">{comparisonStock.proInfo.targetPrice}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-green-400" />
                      <span className="text-dark-300">
                        달성 예상일: <span className="text-amber-400 font-medium">{comparisonStock.proInfo.targetDate}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckIcon className="w-4 h-4 text-green-400" />
                      <span className="text-dark-300">
                        시그널: <span className="text-blue-400 font-medium">{comparisonStock.proInfo.signal}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {showCta && (
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all group"
            >
              <SparklesIcon className="w-5 h-5" />
              PRO로 업그레이드하기
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 테이블 스타일
  if (variant === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-4 text-dark-400 font-medium">정보</th>
              <th className="text-center py-3 px-4 text-dark-400 font-medium">무료</th>
              <th className="text-center py-3 px-4 text-purple-400 font-medium bg-purple-500/5">PRO</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Top 5 추천', free: true, pro: true },
              { label: 'AI 분석 요약', free: true, pro: true },
              { label: '상세 분석 리포트', free: false, pro: true },
              { label: '목표가', free: false, pro: true },
              { label: '목표 달성 예상일', free: false, pro: true },
              { label: '매수/매도 시그널', free: false, pro: true },
              { label: '실시간 알림', free: false, pro: true },
              { label: '백테스트 전체 기간', free: false, pro: true },
            ].map((row, i) => (
              <tr key={i} className="border-b border-dark-800">
                <td className="py-3 px-4 text-dark-300">{row.label}</td>
                <td className="py-3 px-4 text-center">
                  {row.free ? (
                    <CheckIcon className="w-5 h-5 text-green-400 mx-auto" />
                  ) : (
                    <XIcon className="w-5 h-5 text-dark-600 mx-auto" />
                  )}
                </td>
                <td className="py-3 px-4 text-center bg-purple-500/5">
                  {row.pro ? (
                    <CheckIcon className="w-5 h-5 text-green-400 mx-auto" />
                  ) : (
                    <XIcon className="w-5 h-5 text-dark-600 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showCta && (
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              <SparklesIcon className="w-5 h-5" />
              PRO 시작하기
            </Link>
          </div>
        )}
      </div>
    );
  }

  // 카드 스타일
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 무료 */}
      <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
        <h4 className="text-lg font-bold text-dark-300 mb-4">무료 회원이 보는 정보</h4>
        <div className="bg-dark-900/50 rounded-lg p-4">
          <p className="text-dark-200 font-medium mb-2">{comparisonStock.name}</p>
          <p className="text-dark-400 text-sm">{comparisonStock.freeInfo.analysis}</p>
          <div className="mt-4 p-3 bg-dark-800 rounded-lg flex items-center gap-2 text-dark-500">
            <LockIcon className="w-4 h-4" />
            <span className="text-sm">목표가, 매매 시그널 등 추가 정보 잠김</span>
          </div>
        </div>
      </div>

      {/* PRO */}
      <div className="bg-gradient-to-br from-purple-500/10 to-dark-800/50 rounded-xl p-6 border border-purple-500/30">
        <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5" />
          PRO 회원이 보는 정보
        </h4>
        <div className="bg-dark-900/50 rounded-lg p-4">
          <p className="text-dark-200 font-medium mb-2">{comparisonStock.name}</p>
          <p className="text-dark-300 text-sm mb-3">{comparisonStock.proInfo.analysis}</p>
          <div className="space-y-2 pt-3 border-t border-dark-700">
            <p className="text-sm">
              <span className="text-dark-500">목표가:</span>{' '}
              <span className="text-green-400 font-medium">{comparisonStock.proInfo.targetPrice}</span>
            </p>
            <p className="text-sm">
              <span className="text-dark-500">예상 달성:</span>{' '}
              <span className="text-amber-400 font-medium">{comparisonStock.proInfo.targetDate}</span>
            </p>
            <p className="text-sm">
              <span className="text-dark-500">시그널:</span>{' '}
              <span className="text-blue-400 font-medium">{comparisonStock.proInfo.signal}</span>
            </p>
          </div>
        </div>
        
        {showCta && (
          <Link
            href="/pricing"
            onClick={onCtaClick}
            className="flex items-center justify-center gap-2 w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            PRO 시작하기
          </Link>
        )}
      </div>
    </div>
  );
}

export default ComparisonTable;
