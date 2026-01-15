'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, BellRingIcon, CheckIcon, Trash2Icon, XIcon, SparklesIcon } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrentPlan } from '@/lib/subscription';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

// 알림 타입별 아이콘/색상
const NOTIFICATION_STYLES: Record<string, { icon: string; color: string }> = {
  MORNING_BRIEFING: { icon: '🌅', color: 'text-yellow-400' },
  PRICE_SURGE: { icon: '🚀', color: 'text-green-400' },
  PRICE_DROP: { icon: '⚠️', color: 'text-red-400' },
  BUY_SIGNAL: { icon: '🟢', color: 'text-emerald-400' },
  SELL_SIGNAL: { icon: '🔴', color: 'text-rose-400' },
  VIP_STOCK: { icon: '👑', color: 'text-amber-400' },
  SUBSCRIPTION: { icon: '💳', color: 'text-purple-400' },
  SYSTEM: { icon: '📢', color: 'text-blue-400' },
};

export function NotificationBell() {
  const { user } = useAuth();
  const { currentPlan, loading: planLoading } = useCurrentPlan();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 플랜 확인
  const isFreeUser = !planLoading && (!currentPlan || currentPlan.name === 'free');

  // 알림 데이터 로드
  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/notifications?limit=10');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // 읽지 않은 알림 개수만 조회
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications?action=count');
      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationIds?: string[]) => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: notificationIds ? 'mark_read' : 'mark_all_read',
          notificationIds,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setUnreadCount(data.unreadCount);
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds ? (notificationIds.includes(n.id) ? { ...n, is_read: true } : n) : { ...n, is_read: true }
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // 1분마다 읽지 않은 알림 개수 확인
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // 드롭다운 열릴 때 알림 로드
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 비로그인 상태
  if (!user) {
    return (
      <Link
        href="/api/auth/callback"
        className="relative p-2 text-dark-400 hover:text-dark-200 transition-colors"
        title="로그인 후 알림을 받을 수 있습니다"
      >
        <BellIcon className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen ? 'bg-dark-800 text-brand-400' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
        }`}
        title={isFreeUser ? '알림을 받으려면 베이직으로 업그레이드' : '알림'}
      >
        {unreadCount > 0 ? (
          <BellRingIcon className="w-5 h-5 animate-pulse" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}

        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold bg-red-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 bg-dark-800/50">
            <h3 className="font-semibold text-dark-100">알림</h3>
            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.is_read) && (
                <button
                  onClick={() => markAsRead()}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  <CheckIcon className="w-3 h-3" />
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-dark-500 hover:text-dark-300"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 무료 회원 업그레이드 안내 */}
          {isFreeUser && (
            <div className="px-4 py-3 bg-gradient-to-r from-brand-900/30 to-purple-900/30 border-b border-dark-700">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium text-dark-100">알림 기능 잠금</span>
              </div>
              <p className="text-xs text-dark-400 mb-2">
                모닝 브리핑, 급등/급락 알림, VIP 매매 시그널을 받으려면 업그레이드하세요.
              </p>
              <Link
                href="/pricing"
                className="inline-block text-xs font-medium text-brand-400 hover:text-brand-300"
              >
                플랜 보기 →
              </Link>
            </div>
          )}

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <BellIcon className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-500 text-sm">알림이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800">
                {notifications.map((notification) => {
                  const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.SYSTEM;

                  return (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-3 hover:bg-dark-800/50 transition-colors cursor-pointer group ${
                        !notification.is_read ? 'bg-dark-800/30' : ''
                      }`}
                      onClick={() => !notification.is_read && markAsRead([notification.id])}
                    >
                      {/* 읽지 않음 표시 */}
                      {!notification.is_read && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-500 rounded-full" />
                      )}

                      <div className="flex gap-3">
                        {/* 아이콘 */}
                        <div className={`text-xl ${style.color}`}>{style.icon}</div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium truncate ${!notification.is_read ? 'text-dark-100' : 'text-dark-300'}`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-dark-500 whitespace-nowrap">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-dark-500 hover:text-red-400 transition-all"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 종목 정보 (있는 경우) */}
                      {notification.data?.symbol && (
                        <div className="mt-2 ml-8 text-xs">
                          <span className="text-dark-400">
                            {notification.data.name} ({notification.data.symbol})
                          </span>
                          {notification.data.changePercent !== undefined && (
                            <span
                              className={`ml-2 font-medium ${
                                notification.data.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {notification.data.changePercent >= 0 ? '+' : ''}
                              {notification.data.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-dark-700 bg-dark-800/50 text-center">
              <Link
                href="/mypage?tab=notifications"
                className="text-xs text-brand-400 hover:text-brand-300"
                onClick={() => setIsOpen(false)}
              >
                모든 알림 보기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
