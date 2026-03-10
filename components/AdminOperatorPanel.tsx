'use client';

/**
 * 관리자용 운영자 관리 패널
 */

import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  CheckIcon, 
  XIcon, 
  RefreshCwIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  SearchIcon,
  FilterIcon,
} from 'lucide-react';
import { 
  formatCurrency, 
  formatDate,
  TIER_CONFIG,
  OPERATOR_STATUS_LABELS,
  Operator,
  TierType,
  OperatorStatus,
} from '@/lib/affiliate';
import { SkeletonCard } from '@/components';

interface StatusCounts {
  total: number;
  pending: number;
  active: number;
  suspended: number;
}

interface PayoutSummary {
  totalPending: number;
  totalPaid: number;
  pendingByOperator: Array<{
    operatorId: string;
    operatorName: string;
    operatorEmail: string;
    pendingAmount: number;
  }>;
}

export function AdminOperatorPanel() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0, pending: 0, active: 0, suspended: 0
  });
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutProcessing, setPayoutProcessing] = useState(false);

  // 운영자 목록 로드
  const fetchOperators = async () => {
    try {
      const status = activeTab === 'all' ? '' : activeTab;
      const response = await fetch(`/api/admin/operators?status=${status}&limit=100`);
      const result = await response.json();
      
      if (result.success) {
        setOperators(result.operators || []);
        setStatusCounts(result.statusCounts || { total: 0, pending: 0, active: 0, suspended: 0 });
      }
    } catch (error) {
      console.error('Operators fetch error:', error);
    }
  };

  // 정산 현황 로드
  const fetchPayoutSummary = async () => {
    try {
      const response = await fetch('/api/admin/payouts');
      const result = await response.json();
      
      if (result.success) {
        setPayoutSummary(result);
      }
    } catch (error) {
      console.error('Payout summary fetch error:', error);
    }
  };

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOperators(), fetchPayoutSummary()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 탭 변경 시 다시 로드
  useEffect(() => {
    if (!loading) {
      fetchOperators();
    }
  }, [activeTab]);

  // 운영자 상태 변경
  const updateOperatorStatus = async (operatorId: string, newStatus: OperatorStatus) => {
    setActionLoading(operatorId);
    
    try {
      const response = await fetch('/api/admin/operators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, status: newStatus }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchOperators();
      } else {
        alert(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // 일괄 정산 처리
  const processBatchPayout = async () => {
    if (!confirm('정말 모든 대기 중인 커미션을 정산 처리하시겠습니까?')) {
      return;
    }
    
    setPayoutProcessing(true);
    
    try {
      const response = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`정산 완료! ${result.processed}건 처리됨 (총 ${formatCurrency(result.totalAmount)})`);
        await fetchPayoutSummary();
        await fetchOperators();
        setShowPayoutModal(false);
      } else {
        alert(result.error || '정산 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Payout error:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setPayoutProcessing(false);
    }
  };

  // 필터링된 운영자 목록
  const filteredOperators = operators.filter(op => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      op.name.toLowerCase().includes(term) ||
      op.email.toLowerCase().includes(term) ||
      op.referral_code.toLowerCase().includes(term)
    );
  });

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-24" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} className="h-10 w-24" />)}
        </div>
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 정산 현황 요약 */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <BanknoteIcon className="w-5 h-5 text-emerald-400" />
            정산 현황
          </h2>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={!payoutSummary || payoutSummary.totalPending === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            일괄 정산
          </button>
        </div>
        
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-dark-800/50 rounded-xl p-4">
            <p className="text-sm text-dark-500">정산 대기 금액</p>
            <p className="text-2xl font-bold text-yellow-400">
              {formatCurrency(payoutSummary?.totalPending || 0)}
            </p>
          </div>
          <div className="bg-dark-800/50 rounded-xl p-4">
            <p className="text-sm text-dark-500">총 정산 완료</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(payoutSummary?.totalPaid || 0)}
            </p>
          </div>
          <div className="bg-dark-800/50 rounded-xl p-4">
            <p className="text-sm text-dark-500">대기 운영자 수</p>
            <p className="text-2xl font-bold text-dark-100">
              {payoutSummary?.pendingByOperator?.length || 0}명
            </p>
          </div>
        </div>
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            count={statusCounts.total}
          >
            전체
          </TabButton>
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
            count={statusCounts.pending}
            color="yellow"
          >
            승인 대기
          </TabButton>
          <TabButton
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            count={statusCounts.active}
            color="emerald"
          >
            활성
          </TabButton>
          <TabButton
            active={activeTab === 'suspended'}
            onClick={() => setActiveTab('suspended')}
            count={statusCounts.suspended}
            color="red"
          >
            정지
          </TabButton>
        </div>

        {/* 검색 */}
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="이름, 이메일, 추천코드 검색"
            className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <button
          onClick={() => { fetchOperators(); fetchPayoutSummary(); }}
          className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4 text-dark-400" />
        </button>
      </div>

      {/* 운영자 테이블 */}
      <div className="bg-dark-800/50 rounded-2xl overflow-hidden border border-dark-700">
        {filteredOperators.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dark-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">운영자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">추천코드</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">티어</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">추천수</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-500 uppercase">누적수익</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredOperators.map((op) => {
                  const tierConfig = TIER_CONFIG[op.tier as TierType];
                  const statusConfig = OPERATOR_STATUS_LABELS[op.status as OperatorStatus];
                  
                  return (
                    <tr key={op.id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-dark-100">{op.name}</p>
                          <p className="text-xs text-dark-500">{op.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-emerald-400">
                          {op.referral_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${tierConfig.bg} ${tierConfig.color}`}>
                          {tierConfig.icon} {tierConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-dark-300">
                        {op.total_referrals.toLocaleString()}명
                      </td>
                      <td className="px-4 py-3 text-right text-dark-300">
                        {formatCurrency(op.total_earnings || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* 승인 버튼 (pending 상태일 때) */}
                          {op.status === 'pending' && (
                            <button
                              onClick={() => updateOperatorStatus(op.id, 'active')}
                              disabled={actionLoading === op.id}
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                              title="승인"
                            >
                              {actionLoading === op.id ? '...' : '승인'}
                            </button>
                          )}
                          
                          {/* 정지 버튼 (active 상태일 때) */}
                          {op.status === 'active' && (
                            <button
                              onClick={() => updateOperatorStatus(op.id, 'suspended')}
                              disabled={actionLoading === op.id}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                              title="정지"
                            >
                              {actionLoading === op.id ? '...' : '정지'}
                            </button>
                          )}
                          
                          {/* 재활성화 버튼 (suspended 상태일 때) */}
                          {op.status === 'suspended' && (
                            <button
                              onClick={() => updateOperatorStatus(op.id, 'active')}
                              disabled={actionLoading === op.id}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                              title="재활성화"
                            >
                              {actionLoading === op.id ? '...' : '재활성화'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">
              {searchTerm ? '검색 결과가 없습니다.' : '운영자가 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {/* 일괄 정산 모달 */}
      {showPayoutModal && payoutSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-900 rounded-2xl p-6 max-w-md w-full border border-dark-700">
            <h3 className="text-xl font-bold text-dark-100 mb-4">일괄 정산 확인</h3>
            
            <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-dark-400">총 정산 대기 금액</span>
                <span className="font-bold text-yellow-400">
                  {formatCurrency(payoutSummary.totalPending)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">정산 대상 운영자</span>
                <span className="font-bold text-dark-100">
                  {payoutSummary.pendingByOperator?.length || 0}명
                </span>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-400">
                  이 작업은 모든 대기 중인 커미션을 &apos;정산 완료&apos; 상태로 변경합니다.
                  실제 계좌 이체는 별도로 진행해주세요.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-dark-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={processBatchPayout}
                disabled={payoutProcessing}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
              >
                {payoutProcessing ? '처리 중...' : '정산 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 탭 버튼 컴포넌트
function TabButton({ 
  active, 
  onClick, 
  count, 
  color = 'default',
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  count: number;
  color?: 'default' | 'yellow' | 'emerald' | 'red';
  children: React.ReactNode;
}) {
  const colorClasses = {
    default: active ? 'bg-dark-700 text-dark-100' : 'bg-dark-800 text-dark-400 hover:bg-dark-700',
    yellow: active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-dark-800 text-dark-400 hover:bg-dark-700',
    emerald: active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-800 text-dark-400 hover:bg-dark-700',
    red: active ? 'bg-red-500/20 text-red-400' : 'bg-dark-800 text-dark-400 hover:bg-dark-700',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {children}
      <span className="ml-2 px-1.5 py-0.5 text-xs bg-dark-900/50 rounded">
        {count}
      </span>
    </button>
  );
}

export default AdminOperatorPanel;
