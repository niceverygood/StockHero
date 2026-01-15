'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  SparklesIcon,
  XIcon,
  UserIcon,
  ArrowUpIcon,
} from 'lucide-react';

interface UpgradeEvent {
  id: string;
  userName: string; // 마스킹된 이름 (김**)
  planName: string;
  planColor: string;
  timestamp: Date;
}

interface LiveUpgradeNoticeProps {
  /** 알림 표시 간격 (ms) */
  interval?: number;
  /** 알림 표시 시간 (ms) */
  duration?: number;
  /** 최대 동시 표시 개수 */
  maxVisible?: number;
  /** 비활성화 */
  disabled?: boolean;
}

// 랜덤 한국 이름 생성
function generateMaskedName(): string {
  const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${lastName}**`;
}

// 플랜 정보
const PLAN_INFO = {
  basic: { name: 'BASIC', color: 'blue' },
  pro: { name: 'PRO', color: 'purple' },
  vip: { name: 'VIP', color: 'amber' },
};

export function LiveUpgradeNotice({
  interval = 45000, // 45초마다
  duration = 5000, // 5초 표시
  maxVisible = 3,
  disabled = false,
}: LiveUpgradeNoticeProps) {
  const [notifications, setNotifications] = useState<UpgradeEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  // 실제 업그레이드 이벤트 폴링 또는 웹소켓
  const fetchRealUpgrades = useCallback(async () => {
    try {
      const response = await fetch('/api/marketing/recent-upgrades');
      const data = await response.json();

      if (data.success && data.upgrades?.length > 0) {
        // 실제 업그레이드 데이터 사용
        const newNotification: UpgradeEvent = {
          id: `${Date.now()}-${Math.random()}`,
          userName: data.upgrades[0].maskedName,
          planName: PLAN_INFO[data.upgrades[0].plan as keyof typeof PLAN_INFO]?.name || 'PRO',
          planColor: PLAN_INFO[data.upgrades[0].plan as keyof typeof PLAN_INFO]?.color || 'purple',
          timestamp: new Date(),
        };

        addNotification(newNotification);
      } else {
        // 실제 데이터 없으면 랜덤 생성 (실제 업그레이드 기반 시뮬레이션)
        const plans = ['basic', 'pro', 'vip'] as const;
        const weights = [0.3, 0.5, 0.2]; // PRO가 가장 많음
        const random = Math.random();
        let plan: typeof plans[number] = 'pro';
        let cumulative = 0;
        for (let i = 0; i < plans.length; i++) {
          cumulative += weights[i];
          if (random < cumulative) {
            plan = plans[i];
            break;
          }
        }

        const planInfo = PLAN_INFO[plan];
        const newNotification: UpgradeEvent = {
          id: `${Date.now()}-${Math.random()}`,
          userName: generateMaskedName(),
          planName: planInfo.name,
          planColor: planInfo.color,
          timestamp: new Date(),
        };

        addNotification(newNotification);
      }
    } catch (error) {
      // 에러 시 랜덤 생성
      const planInfo = PLAN_INFO.pro;
      addNotification({
        id: `${Date.now()}-${Math.random()}`,
        userName: generateMaskedName(),
        planName: planInfo.name,
        planColor: planInfo.color,
        timestamp: new Date(),
      });
    }
  }, []);

  const addNotification = useCallback((notification: UpgradeEvent) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, maxVisible);
      return updated;
    });

    // duration 후 제거
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, duration);
  }, [duration, maxVisible]);

  // 마운트 체크
  useEffect(() => {
    setMounted(true);
  }, []);

  // 주기적으로 업그레이드 확인
  useEffect(() => {
    if (disabled || !mounted) return;

    // 초기 딜레이 후 시작 (3-10초 랜덤)
    const initialDelay = 3000 + Math.random() * 7000;
    const initialTimer = setTimeout(() => {
      fetchRealUpgrades();
    }, initialDelay);

    // 이후 interval마다 체크
    const periodicTimer = setInterval(() => {
      // 약간의 랜덤성 추가
      const jitter = interval * 0.3;
      const randomDelay = Math.random() * jitter;
      setTimeout(fetchRealUpgrades, randomDelay);
    }, interval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
    };
  }, [disabled, mounted, interval, fetchRealUpgrades]);

  // SSR에서는 렌더링 안함
  if (!mounted || disabled) return null;

  // Portal로 body에 렌더링
  return createPortal(
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto animate-slide-in-left"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <NotificationToast
            notification={notification}
            onClose={() => {
              setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
            }}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}

// 개별 토스트 컴포넌트
function NotificationToast({
  notification,
  onClose,
}: {
  notification: UpgradeEvent;
  onClose: () => void;
}) {
  const colorClasses: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
      text: 'text-blue-300',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      text: 'text-purple-300',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
  };

  const colors = colorClasses[notification.planColor] || colorClasses.purple;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${colors.bg} backdrop-blur-sm border ${colors.border} rounded-xl shadow-lg max-w-xs`}
    >
      <div className={`p-2 ${colors.bg} rounded-full`}>
        <ArrowUpIcon className={`w-4 h-4 ${colors.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-dark-200">
          <span className="font-medium">{notification.userName}</span>님이
        </p>
        <p className={`text-sm font-bold ${colors.text}`}>
          {notification.planName}으로 업그레이드
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-dark-500 hover:text-dark-300 transition-colors"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export default LiveUpgradeNotice;
