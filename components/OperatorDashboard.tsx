'use client';

/**
 * 운영자 대시보드 메인 컴포넌트
 * - 추천코드 & 링크 복사
 * - 실적 요약 카드
 * - 수익 현황
 * - 티어 진행 바
 * - 최근 추천 유저 테이블
 * - 커미션 내역 테이블
 */

import React, { useState, useEffect } from 'react';
import { 
  CopyIcon, 
  CheckIcon, 
  UsersIcon, 
  CrownIcon, 
  TrendingUpIcon, 
  TargetIcon,
  WalletIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { 
  TIER_CONFIG, 
  getReferralsToNextTier, 
  formatCurrency, 
  formatDate,
  OPERATOR_STATUS_LABELS,
  TierType,
  OperatorStatus,
} from '@/lib/affiliate';
import { SkeletonCard } from '@/components';

interface DashboardData {
  operator: {
    id: string;
    name: string;
    referral_code: string;
    tier: TierType;
    commission_rate: number;
    status: OperatorStatus;
  };
  stats: {
    totalReferrals: number;
    activeSubscribers: number;
    thisMonthNew: number;
    conversionRate: number;
  };
  earnings: {
    thisMonth: number;
    totalEarnings: number;
    pendingPayout: number;
    paidOut: number;
  };
  recentReferrals: Array<{
    userId: string;
    createdAt: string;
    hasSubscription: boolean;
  }>;
}

interface CommissionItem {
  id: string;
  amount: number;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  paidAt: string | null;
}

export function OperatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'commissions'>('referrals');

  // 대시보드 데이터 로드
  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/operators/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  // 커미션 데이터 로드
  const fetchCommissions = async () => {
    try {
      const response = await fetch('/api/operators/commissions?limit=10');
      const result = await response.json();
      
      if (result.success) {
        setCommissions(result.commissions || []);
      }
    } catch (error) {
      console.error('Commissions fetch error:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchCommissions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 복사 함수
  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
        <SkeletonCard className="h-48" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-dark-400">대시보드를 불러올 수 없습니다.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-dark-800 rounded-lg text-dark-300 hover:bg-dark-700"
        >
          새로고침
        </button>
      </div>
    );
  }

  const { operator, stats, earnings, recentReferrals } = data;
  const tierConfig = TIER_CONFIG[operator.tier];
  const tierProgress = getReferralsToNextTier(stats.totalReferrals);
  const referralLink = `https://stockhero.app/join?ref=${operator.referral_code}`;
  const statusConfig = OPERATOR_STATUS_LABELS[operator.status];

  return (
    <div className="space-y-6">
      {/* 상태 배너 (pending/suspended인 경우) */}
      {operator.status !== 'active' && (
        <div className={`${statusConfig.bg} border border-${operator.status === 'pending' ? 'yellow' : 'red'}-500/30 rounded-xl p-4`}>
          <p className={`${statusConfig.color} font-medium`}>
            {operator.status === 'pending' 
              ? '⏳ 관리자 승인 대기 중입니다. 승인 후 추천 활동이 가능합니다.'
              : '⚠️ 계정이 정지되었습니다. 관리자에게 문의해주세요.'
            }
          </p>
        </div>
      )}

      {/* 추천코드 영역 */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-dark-100 mb-4">내 추천코드</h2>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {/* 추천코드 */}
          <div className="bg-dark-800/50 rounded-xl p-4">
            <label className="text-sm text-dark-500 mb-2 block">추천코드</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-400 font-mono tracking-wider">
                {operator.referral_code}
              </span>
              <button
                onClick={() => copyToClipboard(operator.referral_code, 'code')}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="복사"
              >
                {copiedCode ? (
                  <CheckIcon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <CopyIcon className="w-5 h-5 text-dark-400" />
                )}
              </button>
            </div>
          </div>

          {/* 추천 링크 */}
          <div className="bg-dark-800/50 rounded-xl p-4">
            <label className="text-sm text-dark-500 mb-2 block">추천 링크</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-300 truncate flex-1 font-mono">
                {referralLink}
              </span>
              <button
                onClick={() => copyToClipboard(referralLink, 'link')}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="복사"
              >
                {copiedLink ? (
                  <CheckIcon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <CopyIcon className="w-5 h-5 text-dark-400" />
                )}
              </button>
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                title="링크 열기"
              >
                <ExternalLinkIcon className="w-5 h-5 text-dark-400" />
              </a>
            </div>
          </div>
        </div>

        <p className="text-xs text-dark-500 mt-4">
          이 링크를 통해 가입한 유저가 구독하면 {operator.commission_rate}% 커미션을 받습니다.
        </p>
      </div>

      {/* 실적 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UsersIcon className="w-5 h-5" />}
          label="총 추천 가입자"
          value={stats.totalReferrals.toLocaleString('ko-KR')}
          suffix="명"
          color="blue"
        />
        <StatCard
          icon={<CrownIcon className="w-5 h-5" />}
          label="현재 구독 중"
          value={stats.activeSubscribers.toLocaleString('ko-KR')}
          suffix="명"
          color="amber"
        />
        <StatCard
          icon={<TrendingUpIcon className="w-5 h-5" />}
          label="이번 달 신규"
          value={stats.thisMonthNew.toLocaleString('ko-KR')}
          suffix="명"
          color="emerald"
        />
        <StatCard
          icon={<TargetIcon className="w-5 h-5" />}
          label="전환율"
          value={stats.conversionRate.toFixed(1)}
          suffix="%"
          color="purple"
        />
      </div>

      {/* 수익 현황 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <WalletIcon className="w-5 h-5 text-emerald-400" />
            수익 현황
          </h2>
          <button
            onClick={() => { fetchDashboard(); fetchCommissions(); }}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4 text-dark-400" />
          </button>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <EarningsCard 
            label="이번 달 예상" 
            amount={earnings.thisMonth} 
            highlight 
          />
          <EarningsCard 
            label="누적 수익" 
            amount={earnings.totalEarnings} 
          />
          <EarningsCard 
            label="정산 대기" 
            amount={earnings.pendingPayout} 
            pending 
          />
          <EarningsCard 
            label="정산 완료" 
            amount={earnings.paidOut} 
          />
        </div>
      </div>

      {/* 티어 진행 바 */}
      <div className="bg-dark-800/50 rounded-2xl p-6 border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-100">등급 현황</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierConfig.bg} ${tierConfig.color}`}>
            {tierConfig.icon} {tierConfig.label} ({operator.commission_rate}%)
          </span>
        </div>

        {tierProgress.nextTier ? (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-dark-400">
                  다음 등급: {TIER_CONFIG[tierProgress.nextTier].label}
                </span>
                <span className="text-dark-300">
                  {stats.totalReferrals} / {TIER_CONFIG[tierProgress.nextTier].min}명
                </span>
              </div>
              <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${tierProgress.progress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-dark-500">
              {tierProgress.remaining}명 더 추천하면 {TIER_CONFIG[tierProgress.nextTier].label} 등급으로 승급!
              (커미션 {TIER_CONFIG[tierProgress.nextTier].rate}%)
            </p>
          </>
        ) : (
          <p className="text-emerald-400">
            🎉 최고 등급에 도달했습니다! 최대 커미션을 받고 있습니다.
          </p>
        )}

        {/* 티어 안내 */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-dark-700">
          {Object.entries(TIER_CONFIG).map(([key, config]) => (
            <div 
              key={key} 
              className={`text-center p-2 rounded-lg ${
                key === operator.tier ? config.bg : 'bg-dark-900/50'
              }`}
            >
              <span className="text-lg">{config.icon}</span>
              <p className={`text-xs ${key === operator.tier ? config.color : 'text-dark-500'}`}>
                {config.label}
              </p>
              <p className={`text-sm font-bold ${key === operator.tier ? config.color : 'text-dark-400'}`}>
                {config.rate}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'referrals'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          최근 추천 유저
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'commissions'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          커미션 내역
        </button>
      </div>

      {/* 최근 추천 유저 테이블 */}
      {activeTab === 'referrals' && (
        <div className="bg-dark-800/50 rounded-2xl overflow-hidden border border-dark-700">
          {recentReferrals.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-dark-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">유저 ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">가입일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">구독 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {recentReferrals.map((ref, idx) => (
                  <tr key={idx} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-dark-300 font-mono">
                      {ref.userId.substring(0, 8)}***
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-400">
                      {formatDate(ref.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {ref.hasSubscription ? (
                        <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                          구독 중
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-dark-700 text-dark-400 rounded-full">
                          미구독
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">아직 추천 가입자가 없습니다.</p>
              <p className="text-sm text-dark-500 mt-2">추천 링크를 공유해보세요!</p>
            </div>
          )}
        </div>
      )}

      {/* 커미션 내역 테이블 */}
      {activeTab === 'commissions' && (
        <div className="bg-dark-800/50 rounded-2xl overflow-hidden border border-dark-700">
          {commissions.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-dark-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">날짜</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">결제 금액</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">커미션</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {commissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-dark-300">
                      {formatDate(comm.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-400 text-right">
                      {formatCurrency(comm.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400 font-medium text-right">
                      +{formatCurrency(comm.commissionAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {comm.status === 'pending' && (
                        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                          대기
                        </span>
                      )}
                      {comm.status === 'paid' && (
                        <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                          정산됨
                        </span>
                      )}
                      {comm.status === 'cancelled' && (
                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                          취소
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <WalletIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">아직 커미션 내역이 없습니다.</p>
              <p className="text-sm text-dark-500 mt-2">추천 유저가 구독하면 커미션이 발생합니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({ 
  icon, 
  label, 
  value, 
  suffix, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  suffix: string;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  };

  const iconColors = {
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className={`${iconColors[color]} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-dark-100">
        {value}<span className="text-sm font-normal text-dark-400">{suffix}</span>
      </p>
      <p className="text-xs text-dark-500">{label}</p>
    </div>
  );
}

// 수익 카드 컴포넌트
function EarningsCard({ 
  label, 
  amount, 
  highlight = false,
  pending = false,
}: { 
  label: string; 
  amount: number;
  highlight?: boolean;
  pending?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${
      highlight 
        ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30' 
        : 'bg-dark-900/50'
    }`}>
      <p className="text-sm text-dark-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${
        pending ? 'text-yellow-400' : highlight ? 'text-emerald-400' : 'text-dark-100'
      }`}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

export default OperatorDashboard;
