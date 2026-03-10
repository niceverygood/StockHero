'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { isAdmin, SUBSCRIPTION_TIERS } from '@/lib/admin/config';
import { 
  UsersIcon, 
  CreditCardIcon, 
  ShieldCheckIcon,
  SearchIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  CrownIcon,
  RefreshCwIcon,
  SparklesIcon,
  PlayIcon,
  CalendarIcon,
  AlertCircleIcon,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  subscription: {
    tier: string;
    is_active: boolean;
    expires_at: string | null;
    started_at: string;
  } | null;
}

interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  order_id: string;
  amount: number;
  plan: string;
  status: string;
  payment_method: string;
  created_at: string;
  completed_at: string | null;
}

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
}

interface DebateResult {
  date: string;
  top5: Array<{
    rank: number;
    symbol: string;
    name: string;
    avgScore: number;
    isUnanimous: boolean;
  }>;
  message: string;
}

export default function AdminPage() {
  const { user, loading: authLoading, session } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'ai-debate'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradeUserId, setUpgradeUserId] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  
  // AI 토론 관련 상태
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [debateError, setDebateError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  });
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // OpenRouter / Verdict 진단
  const [openRouterStatus, setOpenRouterStatus] = useState<any>(null);
  const [openRouterLoading, setOpenRouterLoading] = useState(false);
  const [verdictStatus, setVerdictStatus] = useState<any>(null);
  const [verdictStatusLoading, setVerdictStatusLoading] = useState(false);
  const [verdictCronLoading, setVerdictCronLoading] = useState(false);

  // 관리자 권한 체크
  const userIsAdmin = isAdmin(user?.email);

  useEffect(() => {
    if (!authLoading && userIsAdmin && session?.access_token) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchPayments();
      }
    }
  }, [authLoading, userIsAdmin, activeTab, session?.access_token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
        setPaymentStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (userId: string, tier: string) => {
    setUpgradeLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.success) {
        // 사용자 목록 새로고침
        await fetchUsers();
        setUpgradeUserId(null);
      } else {
        alert(data.error || '권한 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to upgrade user:', error);
      alert('권한 변경에 실패했습니다.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const fetchOpenRouterStatus = async () => {
    setOpenRouterLoading(true);
    setOpenRouterStatus(null);
    try {
      const res = await fetch('/api/admin/openrouter-status', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setOpenRouterStatus(data);
    } catch (e) {
      setOpenRouterStatus({ ok: false, error: String(e) });
    } finally {
      setOpenRouterLoading(false);
    }
  };

  const fetchVerdictStatus = async () => {
    setVerdictStatusLoading(true);
    setVerdictStatus(null);
    try {
      const res = await fetch('/api/admin/verdict-status?limit=30', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setVerdictStatus(data);
    } catch (e) {
      setVerdictStatus({ success: false, error: String(e) });
    } finally {
      setVerdictStatusLoading(false);
    }
  };

  const runVerdictCronNow = async () => {
    setVerdictCronLoading(true);
    try {
      const res = await fetch('/api/admin/run-verdict-cron', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setVerdictStatus((prev: any) => prev ? { ...prev, message: `방금 생성됨: ${data.date} (${data.message})` } : null);
        await fetchVerdictStatus();
      } else {
        alert(data.error || '실행 실패');
      }
    } catch (e) {
      alert('요청 실패: ' + String(e));
    } finally {
      setVerdictCronLoading(false);
    }
  };

  // AI 토론 생성 함수
  const generateDebate = async () => {
    setDebateLoading(true);
    setDebateError(null);
    setDebateResult(null);
    
    try {
      const url = `/api/cron/daily-top5-debate?date=${selectedDate}${forceRegenerate ? '&force=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setDebateResult({
          date: data.date,
          top5: data.verdict?.top5 || [],
          message: data.message,
        });
      } else {
        setDebateError(data.error || 'AI 토론 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to generate debate:', error);
      setDebateError('AI 토론 생성 중 오류가 발생했습니다.');
    } finally {
      setDebateLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierBadge = (tier: string | undefined) => {
    const tierInfo = SUBSCRIPTION_TIERS.find(t => t.value === tier) || SUBSCRIPTION_TIERS[0];
    const colors: Record<string, string> = {
      free: 'bg-dark-700 text-dark-300',
      premium: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      pro: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      vip: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[tier || 'free']}`}>
        {tierInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-500/20 text-emerald-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-dark-700 text-dark-400',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || colors.pending}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  // 로딩 중
  if (authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        </main>
      </>
    );
  }

  // 비로그인 또는 권한 없음
  if (!user || !userIsAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-dark-950 pt-24">
          <div className="container-app">
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldCheckIcon className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-dark-100 mb-2">접근 권한 없음</h1>
              <p className="text-dark-400 mb-6">
                관리자만 접근할 수 있는 페이지입니다.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
              >
                홈으로 돌아가기
              </a>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-dark-950 pt-24 pb-12">
        {/* Background */}
        <div className="fixed inset-0 bg-grid opacity-30" />
        <div className="fixed top-1/3 right-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px]" />

        <div className="relative container-app">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-dark-100">관리자 대시보드</h1>
              </div>
              <p className="text-dark-400 text-sm">{user.email}</p>
            </div>
            <button
              onClick={() => activeTab === 'users' ? fetchUsers() : fetchPayments()}
              className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCwIcon className={`w-5 h-5 text-dark-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'payments'
                  ? 'bg-brand-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              <CreditCardIcon className="w-4 h-4" />
              결제 내역
            </button>
            <button
              onClick={() => setActiveTab('ai-debate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'ai-debate'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-dark-200'
              }`}
            >
              <SparklesIcon className="w-4 h-4" />
              AI 토론 관리
            </button>
          </div>

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이메일로 검색..."
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                  <p className="text-dark-500 text-sm">전체 사용자</p>
                  <p className="text-2xl font-bold text-dark-100">{users.length}</p>
                </div>
                <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                  <p className="text-dark-500 text-sm">VIP</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {users.filter(u => u.subscription?.tier === 'vip').length}
                  </p>
                </div>
                <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                  <p className="text-dark-500 text-sm">PRO</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {users.filter(u => u.subscription?.tier === 'pro').length}
                  </p>
                </div>
                <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                  <p className="text-dark-500 text-sm">무료</p>
                  <p className="text-2xl font-bold text-dark-400">
                    {users.filter(u => !u.subscription || u.subscription.tier === 'free').length}
                  </p>
                </div>
              </div>

              {/* User List */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-800">
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">이메일</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">등급</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">가입일</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">마지막 로그인</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-dark-500">
                            <RefreshCwIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                            로딩 중...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-dark-500">
                            사용자가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isAdmin(u.email) && (
                                  <span title="관리자">
                                    <ShieldCheckIcon className="w-4 h-4 text-red-400" />
                                  </span>
                                )}
                                <span className="text-dark-200 text-sm">{u.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {getTierBadge(u.subscription?.tier)}
                            </td>
                            <td className="px-4 py-3 text-dark-400 text-sm">
                              {formatDate(u.created_at)}
                            </td>
                            <td className="px-4 py-3 text-dark-400 text-sm">
                              {formatDate(u.last_sign_in_at)}
                            </td>
                            <td className="px-4 py-3">
                              {upgradeUserId === u.id ? (
                                <div className="flex items-center gap-1">
                                  {SUBSCRIPTION_TIERS.map((tier) => (
                                    <button
                                      key={tier.value}
                                      onClick={() => handleUpgrade(u.id, tier.value)}
                                      disabled={upgradeLoading}
                                      className={`px-2 py-1 text-xs rounded transition-colors ${
                                        u.subscription?.tier === tier.value
                                          ? 'bg-brand-500 text-white'
                                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                                      }`}
                                    >
                                      {tier.label}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setUpgradeUserId(null)}
                                    className="p-1 text-dark-500 hover:text-dark-300"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setUpgradeUserId(u.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm rounded-lg transition-colors"
                                >
                                  <CrownIcon className="w-3 h-3" />
                                  등급 변경
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Stats */}
              {paymentStats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                    <p className="text-dark-500 text-sm">총 매출</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(paymentStats.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                    <p className="text-dark-500 text-sm">전체 결제</p>
                    <p className="text-2xl font-bold text-dark-100">{paymentStats.totalTransactions}</p>
                  </div>
                  <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                    <p className="text-dark-500 text-sm">완료</p>
                    <p className="text-2xl font-bold text-emerald-400">{paymentStats.completedTransactions}</p>
                  </div>
                  <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                    <p className="text-dark-500 text-sm">대기</p>
                    <p className="text-2xl font-bold text-yellow-400">{paymentStats.pendingTransactions}</p>
                  </div>
                  <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-4">
                    <p className="text-dark-500 text-sm">실패</p>
                    <p className="text-2xl font-bold text-red-400">{paymentStats.failedTransactions}</p>
                  </div>
                </div>
              )}

              {/* Payment List */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-800">
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">주문 ID</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">사용자</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">플랜</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">금액</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">상태</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">결제일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-dark-500">
                            <RefreshCwIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                            로딩 중...
                          </td>
                        </tr>
                      ) : payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-dark-500">
                            결제 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr key={p.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                            <td className="px-4 py-3 text-dark-300 text-sm font-mono">
                              {p.order_id?.slice(0, 12)}...
                            </td>
                            <td className="px-4 py-3 text-dark-200 text-sm">{p.user_email}</td>
                            <td className="px-4 py-3">{getTierBadge(p.plan)}</td>
                            <td className="px-4 py-3 text-dark-200 text-sm font-medium">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                            <td className="px-4 py-3 text-dark-400 text-sm">
                              {formatDate(p.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AI Debate Tab */}
          {activeTab === 'ai-debate' && (
            <div className="space-y-6">
              {/* 설명 */}
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-2">AI 3대장 토론 시스템</h2>
                    <p className="text-dark-300 text-sm mb-3">
                      Claude, Gemini, GPT 세 AI가 3라운드 토론을 통해 오늘의 Top 5 종목을 선정합니다.
                      매일 오전 8시(KST)에 자동 실행되며, 여기서 수동으로 트리거할 수도 있습니다.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-dark-400">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        자동 실행: 매일 오전 8시·정오 (KST)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* OpenRouter / Verdict 진단 */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">AI 분석 진단 (결과가 며칠째 같을 때)</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={fetchOpenRouterStatus}
                    disabled={openRouterLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {openRouterLoading ? '확인 중...' : 'OpenRouter 키·크레딧 확인'}
                  </button>
                  <button
                    type="button"
                    onClick={fetchVerdictStatus}
                    disabled={verdictStatusLoading}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {verdictStatusLoading ? '조회 중...' : 'Verdict 최근 이력 조회'}
                  </button>
                  <button
                    type="button"
                    onClick={runVerdictCronNow}
                    disabled={verdictCronLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {verdictCronLoading ? '실행 중...' : '오늘 추천 지금 재생성 (force)'}
                  </button>
                </div>
                {openRouterStatus && (
                  <div className="mb-4 p-4 rounded-lg bg-dark-800 border border-dark-700">
                    <p className="text-dark-300 font-medium mb-2">OpenRouter 상태</p>
                    {openRouterStatus.keyWorks !== undefined && (
                      <p className="text-sm">
                        키 동작: <span className={openRouterStatus.keyWorks ? 'text-emerald-400' : 'text-red-400'}>
                          {openRouterStatus.keyWorks ? '정상' : '실패'}
                        </span>
                        {openRouterStatus.credits && (
                          <> · 크레딧: {openRouterStatus.credits.total_credits ?? '-'} (사용: {openRouterStatus.credits.total_usage ?? '-'})</>
                        )}
                        {openRouterStatus.creditsError && (
                          <span className="text-dark-500"> · 크레딧 조회: {openRouterStatus.creditsError}</span>
                        )}
                        {openRouterStatus.testError && (
                          <span className="text-red-400"> · 테스트 오류: {openRouterStatus.testError}</span>
                        )}
                        {openRouterStatus.hint && (
                          <span className="block mt-1 text-amber-400/90 text-xs">{openRouterStatus.hint}</span>
                        )}
                      </p>
                    )}
                    {openRouterStatus.error && (
                      <p className="text-sm text-red-400">{openRouterStatus.error}</p>
                    )}
                  </div>
                )}
                {verdictStatus && (
                  <div className="p-4 rounded-lg bg-dark-800 border border-dark-700">
                    <p className="text-dark-300 font-medium mb-2">Verdict 이력</p>
                    <p className="text-sm text-dark-400 mb-2">
                      총 {verdictStatus.totalCount ?? 0}건 · 서로 다른 날짜 {verdictStatus.uniqueDates ?? 0}일
                      {verdictStatus.dateRange && (
                        <> · 기간: {verdictStatus.dateRange.first} ~ {verdictStatus.dateRange.last}</>
                      )}
                    </p>
                    {verdictStatus.message && (
                      <p className="text-amber-400/90 text-xs mb-2">{verdictStatus.message}</p>
                    )}
                    {verdictStatus.verdicts?.length > 0 && (
                      <ul className="text-xs text-dark-500 space-y-1 max-h-40 overflow-y-auto">
                        {verdictStatus.verdicts.slice(0, 15).map((v: any) => (
                          <li key={v.id}>
                            {v.date} {v.slot ? `(${v.slot})` : ''} · {v.created_at?.slice(0, 19) || '-'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* 토론 생성 컨트롤 */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">토론 생성</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* 날짜 선택 */}
                  <div>
                    <label className="block text-sm text-dark-400 mb-2">날짜 선택</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  {/* 강제 재생성 옵션 */}
                  <div>
                    <label className="block text-sm text-dark-400 mb-2">옵션</label>
                    <label className="flex items-center gap-3 px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl cursor-pointer hover:border-dark-600">
                      <input
                        type="checkbox"
                        checked={forceRegenerate}
                        onChange={(e) => setForceRegenerate(e.target.checked)}
                        className="w-4 h-4 rounded border-dark-600 text-purple-500 focus:ring-purple-500 bg-dark-700"
                      />
                      <span className="text-white text-sm">기존 데이터 덮어쓰기</span>
                    </label>
                  </div>
                  
                  {/* 실행 버튼 */}
                  <div>
                    <label className="block text-sm text-dark-400 mb-2">실행</label>
                    <button
                      onClick={generateDebate}
                      disabled={debateLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {debateLoading ? (
                        <>
                          <RefreshCwIcon className="w-5 h-5 animate-spin" />
                          AI 토론 진행 중...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-5 h-5" />
                          토론 시작
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 로딩 상태 */}
                {debateLoading && (
                  <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                        <span className="text-2xl">🎓</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse" style={{ animationDelay: '0.2s' }}>
                        <span className="text-2xl">🚀</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse" style={{ animationDelay: '0.4s' }}>
                        <span className="text-2xl">🎩</span>
                      </div>
                    </div>
                    <p className="text-dark-300 mb-2">3명의 AI가 열띤 토론 중입니다...</p>
                    <p className="text-dark-500 text-sm">약 30초~1분 소요됩니다</p>
                  </div>
                )}

                {/* 에러 */}
                {debateError && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">오류 발생</p>
                      <p className="text-red-300/80 text-sm">{debateError}</p>
                    </div>
                  </div>
                )}

                {/* 결과 */}
                {debateResult && (
                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckIcon className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">토론 완료!</span>
                      <span className="text-dark-400 text-sm">({debateResult.date})</span>
                    </div>
                    
                    <p className="text-dark-300 text-sm mb-4">{debateResult.message}</p>
                    
                    {debateResult.top5.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-white font-medium mb-3">🏆 선정된 Top 5</p>
                        {debateResult.top5.map((stock, idx) => (
                          <div 
                            key={stock.symbol}
                            className="flex items-center justify-between bg-dark-800/50 rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                                idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                                idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-dark-700 text-dark-400'
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="text-white font-medium">{stock.name}</p>
                                <p className="text-dark-500 text-xs">{stock.symbol}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {stock.isUnanimous && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                  만장일치
                                </span>
                              )}
                              <span className="text-lg font-bold text-amber-400">
                                {stock.avgScore.toFixed(1)}점
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 크론잡 상태 안내 */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">자동 실행 설정</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-dark-300">Vercel Cron: <code className="text-purple-400">0 23 * * *</code> (UTC)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-dark-300">한국 시간: 매일 오전 8시</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-dark-300">API 엔드포인트: <code className="text-purple-400">/api/cron/daily-top5-debate</code></span>
                  </div>
                </div>
                <p className="text-dark-500 text-xs mt-4">
                  * Vercel Pro 플랜에서 크론잡이 자동 실행됩니다. 무료 플랜에서는 수동 트리거가 필요합니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
