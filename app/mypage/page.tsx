'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DisclaimerBar, Header, CharacterAvatar, MyPortfolioViewer, FeedList } from '@/components';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { CHARACTERS } from '@/lib/characters';
import type { CharacterType } from '@/lib/llm/types';

// Loading fallback for Suspense
function MyPageLoading() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="animate-pulse text-dark-400">로딩 중...</div>
    </div>
  );
}

interface DebateHistory {
  id: string;
  symbol_code: string;
  symbol_name: string;
  watched_rounds: number;
  total_rounds: number;
  completed: boolean;
  last_watched_at: string;
}

interface ConsultationHistory {
  id: string;
  character_type: CharacterType;
  topic: string;
  messages_count: number;
  created_at: string;
}

interface WatchlistItem {
  id: string;
  symbol_code: string;
  symbol_name: string;
  memo: string | null;
  created_at: string;
}

interface UserStats {
  total_debates_watched: number;
  total_consultations: number;
  total_watchlist_items: number;
  favorite_sector: string | null;
  most_discussed_stock: string | null;
}

type TabType = 'overview' | 'feed' | 'portfolio' | 'debates' | 'consultations' | 'watchlist' | 'settings';

// Main page wrapper with Suspense
export default function MyPage() {
  return (
    <Suspense fallback={<MyPageLoading />}>
      <MyPageContent />
    </Suspense>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'overview');
  const [debateHistory, setDebateHistory] = useState<DebateHistory[]>([]);
  const [consultations, setConsultations] = useState<ConsultationHistory[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [preferredAnalyst, setPreferredAnalyst] = useState<CharacterType>('claude');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch debate history
      const { data: debates } = await supabase
        .from('user_debate_history')
        .select('*')
        .eq('user_id', user.id)
        .order('last_watched_at', { ascending: false })
        .limit(10);

      // Fetch consultations
      const { data: consults } = await supabase
        .from('user_consultations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch watchlist
      const { data: watchlistData } = await supabase
        .from('user_watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch or create user stats
      let { data: statsData } = await supabase
        .from('user_activity_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!statsData) {
        // Create initial stats
        const { data: newStats } = await supabase
          .from('user_activity_stats')
          .insert({ user_id: user.id })
          .select()
          .single();
        statsData = newStats;
      }

      // Fetch preferences
      let { data: prefsData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsData) {
        setPreferredAnalyst(prefsData.preferred_analyst);
        setNotificationEnabled(prefsData.notification_enabled);
        setEmailDigest(prefsData.email_digest);
      }

      setDebateHistory(debates || []);
      setConsultations(consults || []);
      setWatchlist(watchlistData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferred_analyst: preferredAnalyst,
          notification_enabled: notificationEnabled,
          email_digest: emailDigest,
        });
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const removeFromWatchlist = async (id: string) => {
    if (!user) return;

    try {
      await supabase
        .from('user_watchlist')
        .delete()
        .eq('id', id);
      setWatchlist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-pulse text-dark-400">로딩 중...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: '개요', icon: '📊' },
    { id: 'feed' as TabType, label: '피드', icon: '📝' },
    { id: 'portfolio' as TabType, label: '내 포트폴리오', icon: '💼' },
    { id: 'debates' as TabType, label: '토론 기록', icon: '💬' },
    { id: 'consultations' as TabType, label: '상담 기록', icon: '🤖' },
    { id: 'watchlist' as TabType, label: '관심 종목', icon: '⭐' },
    { id: 'settings' as TabType, label: '설정', icon: '⚙️' },
  ];

  return (
    <>
      <DisclaimerBar />
      <Header />
      <main className="min-h-screen bg-dark-950 pt-32 pb-20">
        <div className="container-app">
          {/* Profile Header */}
          <div className="glass rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-6">
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata?.full_name || 'User'}
                  width={80}
                  height={80}
                  className="rounded-full ring-4 ring-brand-500/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-2xl">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      {user.user_metadata?.full_name || '사용자'}
                    </h1>
                    <p className="text-dark-400">{user.email}</p>
                  </div>
                  <Link
                    href={`/user/${user.id}`}
                    className="px-4 py-2 rounded-lg bg-dark-800 text-dark-300 text-sm font-medium hover:bg-dark-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    공개 프로필
                  </Link>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-sm text-dark-300">
                    <span className="text-brand-400 font-semibold">{stats?.total_debates_watched || 0}</span>
                    <span className="text-dark-500">토론 시청</span>
                  </div>
                  <div className="w-px h-4 bg-dark-700" />
                  <div className="flex items-center gap-1 text-sm text-dark-300">
                    <span className="text-emerald-400 font-semibold">{stats?.total_consultations || 0}</span>
                    <span className="text-dark-500">AI 상담</span>
                  </div>
                  <div className="w-px h-4 bg-dark-700" />
                  <div className="flex items-center gap-1 text-sm text-dark-300">
                    <span className="text-amber-400 font-semibold">{watchlist.length}</span>
                    <span className="text-dark-500">관심 종목</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800/50 text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass rounded-2xl p-6">
            {loading ? (
              <div className="py-12 text-center text-dark-400">
                <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
                데이터를 불러오는 중...
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-dark-800/50 rounded-xl p-4">
                        <div className="text-3xl font-bold text-white mb-1">{stats?.total_debates_watched || 0}</div>
                        <div className="text-sm text-dark-400">시청한 토론</div>
                      </div>
                      <div className="bg-dark-800/50 rounded-xl p-4">
                        <div className="text-3xl font-bold text-white mb-1">{stats?.total_consultations || 0}</div>
                        <div className="text-sm text-dark-400">AI 상담 횟수</div>
                      </div>
                      <div className="bg-dark-800/50 rounded-xl p-4">
                        <div className="text-3xl font-bold text-white mb-1">{watchlist.length}</div>
                        <div className="text-sm text-dark-400">관심 종목</div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">최근 활동</h3>
                      {debateHistory.length === 0 && consultations.length === 0 ? (
                        <div className="text-center py-8 text-dark-500">
                          <p className="mb-4">아직 활동 기록이 없습니다.</p>
                          <Link href="/battle/005930" className="btn-primary text-sm">
                            첫 토론 보러가기
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {debateHistory.slice(0, 3).map(item => (
                            <Link
                              key={item.id}
                              href={`/battle/${item.symbol_code}`}
                              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                                💬
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-white">{item.symbol_name}</div>
                                <div className="text-sm text-dark-400">
                                  {item.watched_rounds}/{item.total_rounds} 라운드 시청
                                </div>
                              </div>
                              <div className="text-xs text-dark-500">
                                {new Date(item.last_watched_at).toLocaleDateString('ko-KR')}
                              </div>
                            </Link>
                          ))}
                          {consultations.slice(0, 3).map(item => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30"
                            >
                              <CharacterAvatar character={item.character_type} size="md" />
                              <div className="flex-1">
                                <div className="font-medium text-white">
                                  {CHARACTERS[item.character_type].name} 상담
                                </div>
                                <div className="text-sm text-dark-400 truncate">
                                  {item.topic || '상담 기록'}
                                </div>
                              </div>
                              <div className="text-xs text-dark-500">
                                {new Date(item.created_at).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Favorite Analyst */}
                    {stats?.most_discussed_stock && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">자주 분석한 종목</h3>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800/50">
                          <span className="text-amber-400">⭐</span>
                          <span className="text-white">{stats.most_discussed_stock}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Feed Tab */}
                {activeTab === 'feed' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">내 피드</h3>
                      <Link
                        href={`/user/${user.id}`}
                        className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        내 프로필 보기 →
                      </Link>
                    </div>
                    <FeedList feedType="following" />
                  </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === 'portfolio' && (
                  <MyPortfolioViewer />
                )}

                {/* Debates Tab */}
                {activeTab === 'debates' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">토론 시청 기록</h3>
                    {debateHistory.length === 0 ? (
                      <div className="text-center py-12 text-dark-500">
                        <div className="text-4xl mb-4">💬</div>
                        <p className="mb-4">아직 시청한 토론이 없습니다.</p>
                        <Link href="/battle/005930" className="btn-primary text-sm">
                          토론 보러가기
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {debateHistory.map(item => (
                          <Link
                            key={item.id}
                            href={`/battle/${item.symbol_code}`}
                            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 flex items-center justify-center text-xl">
                              💬
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white group-hover:text-brand-400 transition-colors">
                                  {item.symbol_name}
                                </span>
                                <span className="text-xs text-dark-500">({item.symbol_code})</span>
                                {item.completed && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                                    완료
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-brand-500 rounded-full transition-all"
                                    style={{ width: `${(item.watched_rounds / item.total_rounds) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-dark-400 whitespace-nowrap">
                                  {item.watched_rounds}/{item.total_rounds} 라운드
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-dark-500">
                              {new Date(item.last_watched_at).toLocaleDateString('ko-KR')}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Consultations Tab */}
                {activeTab === 'consultations' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">AI 상담 기록</h3>
                    {consultations.length === 0 ? (
                      <div className="text-center py-12 text-dark-500">
                        <div className="text-4xl mb-4">🤖</div>
                        <p className="mb-4">아직 AI 상담 기록이 없습니다.</p>
                        <Link href="/" className="btn-primary text-sm">
                          AI 상담받으러 가기
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {consultations.map(item => {
                          const char = CHARACTERS[item.character_type];
                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors"
                            >
                              <CharacterAvatar character={item.character_type} size="lg" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">{char.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${char.bgColor} ${char.color}`}>
                                    {char.role}
                                  </span>
                                </div>
                                <p className="text-sm text-dark-400 truncate mt-1">
                                  {item.topic || '상담 대화'}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-dark-500">
                                  <span>{item.messages_count}개 메시지</span>
                                  <span>•</span>
                                  <span>{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Watchlist Tab */}
                {activeTab === 'watchlist' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">관심 종목</h3>
                      <span className="text-sm text-dark-400">{watchlist.length}개 종목</span>
                    </div>
                    {watchlist.length === 0 ? (
                      <div className="text-center py-12 text-dark-500">
                        <div className="text-4xl mb-4">⭐</div>
                        <p className="mb-4">관심 종목이 없습니다.</p>
                        <p className="text-sm">토론 페이지에서 종목을 북마크해보세요!</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {watchlist.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 group"
                          >
                            <Link
                              href={`/battle/${item.symbol_code}`}
                              className="flex-1 flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                ⭐
                              </div>
                              <div>
                                <div className="font-medium text-white group-hover:text-brand-400 transition-colors">
                                  {item.symbol_name}
                                </div>
                                <div className="text-xs text-dark-500">{item.symbol_code}</div>
                              </div>
                            </Link>
                            {item.memo && (
                              <div className="text-xs text-dark-400 max-w-[120px] truncate" title={item.memo}>
                                {item.memo}
                              </div>
                            )}
                            <button
                              onClick={() => removeFromWatchlist(item.id)}
                              className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-dark-800 transition-colors opacity-0 group-hover:opacity-100"
                              title="관심 종목에서 제거"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="max-w-xl space-y-6">
                    <h3 className="text-lg font-semibold text-white mb-4">설정</h3>

                    {/* Preferred Analyst */}
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-3">
                        선호 AI 애널리스트
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['claude', 'gemini', 'gpt'] as const).map(charId => {
                          const char = CHARACTERS[charId];
                          return (
                            <button
                              key={charId}
                              onClick={() => setPreferredAnalyst(charId)}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                preferredAnalyst === charId
                                  ? `border-brand-500 ${char.bgColor}`
                                  : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                              }`}
                            >
                              <CharacterAvatar character={charId} size="md" />
                              <div className="mt-2 text-sm font-medium text-white">{char.name}</div>
                              <div className="text-xs text-dark-400">{char.role}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-dark-300">알림 설정</label>
                      
                      <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                        <div>
                          <div className="font-medium text-white">앱 내 알림</div>
                          <div className="text-sm text-dark-400">새 토론, AI 분석 결과 알림</div>
                        </div>
                        <button
                          onClick={() => setNotificationEnabled(!notificationEnabled)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            notificationEnabled ? 'bg-brand-500' : 'bg-dark-700'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              notificationEnabled ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                        <div>
                          <div className="font-medium text-white">이메일 다이제스트</div>
                          <div className="text-sm text-dark-400">주간 AI 분석 리포트 이메일 수신</div>
                        </div>
                        <button
                          onClick={() => setEmailDigest(!emailDigest)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            emailDigest ? 'bg-brand-500' : 'bg-dark-700'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              emailDigest ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={savePreferences}
                      className="w-full btn-primary py-3"
                    >
                      설정 저장
                    </button>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-dark-800">
                      <h4 className="text-sm font-medium text-red-400 mb-4">위험 구역</h4>
                      <button className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                        모든 데이터 삭제
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <DisclaimerBar variant="bottom" compact />
    </>
  );
}

