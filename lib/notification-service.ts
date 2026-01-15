// =====================================================
// 구독 등급별 알림 서비스
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { PLAN_LIMITS, type PlanName } from './subscription/guard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 알림 타입 정의
export type NotificationType =
  | 'MORNING_BRIEFING'   // 오늘의 Top 5 요약 (베이직+)
  | 'PRICE_SURGE'        // 추천 종목 급등 +5% (프로+)
  | 'PRICE_DROP'         // 추천 종목 급락 -5% (프로+)
  | 'BUY_SIGNAL'         // 매수 타이밍 (VIP)
  | 'SELL_SIGNAL'        // 매도 타이밍 (VIP)
  | 'VIP_STOCK'          // VIP 전용 종목 공개 (VIP)
  | 'SUBSCRIPTION'       // 구독 관련 알림 (모두)
  | 'SYSTEM';            // 시스템 알림 (모두)

// 알림 데이터 인터페이스
export interface NotificationData {
  id?: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read?: boolean;
  created_at?: string;
}

// 알림 타입별 필요 플랜
export const NOTIFICATION_PLAN_REQUIREMENTS: Record<NotificationType, PlanName> = {
  MORNING_BRIEFING: 'basic',
  PRICE_SURGE: 'pro',
  PRICE_DROP: 'pro',
  BUY_SIGNAL: 'vip',
  SELL_SIGNAL: 'vip',
  VIP_STOCK: 'vip',
  SUBSCRIPTION: 'free',
  SYSTEM: 'free',
};

// 플랜 순서
const PLAN_ORDER: PlanName[] = ['free', 'basic', 'pro', 'vip'];

/**
 * 플랜 레벨 비교
 */
function isPlanSufficient(userPlan: PlanName, requiredPlan: PlanName): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan);
}

/**
 * 사용자의 현재 플랜 조회
 */
export async function getUserPlan(userId: string): Promise<PlanName> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan:subscription_plans(name)')
    .eq('user_id', userId)
    .in('status', ['active', 'trial'])
    .single();

  return (subscription?.plan as any)?.name || 'free';
}

/**
 * 알림 생성
 */
export async function createNotification(
  notification: NotificationData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 사용자 플랜 확인
    const userPlan = await getUserPlan(notification.user_id);
    const requiredPlan = NOTIFICATION_PLAN_REQUIREMENTS[notification.type];

    // 플랜 체크 (SUBSCRIPTION, SYSTEM은 모두에게)
    if (!isPlanSufficient(userPlan, requiredPlan)) {
      return {
        success: false,
        error: `This notification requires ${requiredPlan} plan or higher`,
      };
    }

    // 알림 저장
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        is_read: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error('Failed to create notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 여러 사용자에게 알림 일괄 발송
 */
export async function sendBulkNotifications(
  userIds: string[],
  notification: Omit<NotificationData, 'user_id'>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await createNotification({
      ...notification,
      user_id: userId,
    });

    if (result.success) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 특정 플랜 이상 사용자에게 알림 발송
 */
export async function sendNotificationToPlans(
  minPlan: PlanName,
  notification: Omit<NotificationData, 'user_id'>
): Promise<{ success: number; failed: number }> {
  try {
    // 해당 플랜 이상 사용자 조회
    const planIndex = PLAN_ORDER.indexOf(minPlan);
    const eligiblePlans = PLAN_ORDER.slice(planIndex);

    const { data: users, error } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan:subscription_plans(name)')
      .in('status', ['active', 'trial']);

    if (error) throw error;

    const eligibleUsers = users?.filter((u: any) => 
      eligiblePlans.includes(u.plan?.name || 'free')
    ) || [];

    const userIds = eligibleUsers.map((u: any) => u.user_id);

    return sendBulkNotifications(userIds, notification);
  } catch (error) {
    console.error('Failed to send bulk notifications:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * 사용자 알림 조회
 */
export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  } = {}
): Promise<NotificationData[]> {
  const { limit = 20, offset = 0, unreadOnly = false, types } = options;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (types && types.length > 0) {
    query = query.in('type', types);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }

  return data || [];
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(
  userId: string,
  notificationIds?: string[]
): Promise<boolean> {
  try {
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return false;
  }
}

/**
 * 알림 삭제
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

/**
 * 오래된 알림 정리 (30일 이상)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('id');

  if (error) {
    console.error('Failed to cleanup old notifications:', error);
    return 0;
  }

  return data?.length || 0;
}

// ==================== 알림 생성 헬퍼 ====================

/**
 * 모닝 브리핑 알림 생성
 */
export async function sendMorningBriefing(
  top5Stocks: { name: string; symbol: string; returnPercent: number }[]
): Promise<{ success: number; failed: number }> {
  const stockList = top5Stocks
    .slice(0, 3)
    .map((s, i) => `${i + 1}. ${s.name} (${s.returnPercent > 0 ? '+' : ''}${s.returnPercent.toFixed(1)}%)`)
    .join('\n');

  return sendNotificationToPlans('basic', {
    type: 'MORNING_BRIEFING',
    title: '🌅 오늘의 AI 추천 Top 5',
    message: `AI 전문가들이 분석한 오늘의 추천 종목입니다.\n\n${stockList}\n\n자세한 분석은 앱에서 확인하세요.`,
    data: { stocks: top5Stocks },
  });
}

/**
 * 급등 알림 생성
 */
export async function sendPriceSurgeAlert(
  stock: { name: string; symbol: string; changePercent: number; currentPrice: number }
): Promise<{ success: number; failed: number }> {
  return sendNotificationToPlans('pro', {
    type: 'PRICE_SURGE',
    title: `🚀 ${stock.name} 급등 알림!`,
    message: `추천 종목 ${stock.name}(${stock.symbol})이 ${stock.changePercent.toFixed(1)}% 급등했습니다.\n현재가: ${stock.currentPrice.toLocaleString()}원`,
    data: stock,
  });
}

/**
 * 급락 알림 생성
 */
export async function sendPriceDropAlert(
  stock: { name: string; symbol: string; changePercent: number; currentPrice: number }
): Promise<{ success: number; failed: number }> {
  return sendNotificationToPlans('pro', {
    type: 'PRICE_DROP',
    title: `⚠️ ${stock.name} 급락 알림!`,
    message: `추천 종목 ${stock.name}(${stock.symbol})이 ${Math.abs(stock.changePercent).toFixed(1)}% 급락했습니다.\n현재가: ${stock.currentPrice.toLocaleString()}원\n\n손절 라인을 확인하세요.`,
    data: stock,
  });
}

/**
 * 매수 시그널 알림 (VIP 전용)
 */
export async function sendBuySignal(
  stock: { 
    name: string; 
    symbol: string; 
    currentPrice: number;
    targetPrice: number;
    reason: string;
  }
): Promise<{ success: number; failed: number }> {
  const upside = ((stock.targetPrice / stock.currentPrice - 1) * 100).toFixed(1);
  
  return sendNotificationToPlans('vip', {
    type: 'BUY_SIGNAL',
    title: `🟢 ${stock.name} 매수 시그널`,
    message: `AI가 ${stock.name}에 대한 매수 타이밍을 감지했습니다.\n\n현재가: ${stock.currentPrice.toLocaleString()}원\n목표가: ${stock.targetPrice.toLocaleString()}원 (+${upside}%)\n\n${stock.reason}`,
    data: stock,
  });
}

/**
 * 매도 시그널 알림 (VIP 전용)
 */
export async function sendSellSignal(
  stock: {
    name: string;
    symbol: string;
    currentPrice: number;
    entryPrice: number;
    returnPercent: number;
    reason: string;
  }
): Promise<{ success: number; failed: number }> {
  return sendNotificationToPlans('vip', {
    type: 'SELL_SIGNAL',
    title: `🔴 ${stock.name} 매도 시그널`,
    message: `AI가 ${stock.name}에 대한 매도 타이밍을 감지했습니다.\n\n현재가: ${stock.currentPrice.toLocaleString()}원\n수익률: ${stock.returnPercent > 0 ? '+' : ''}${stock.returnPercent.toFixed(1)}%\n\n${stock.reason}`,
    data: stock,
  });
}

/**
 * VIP 전용 종목 공개 알림
 */
export async function sendVIPStockAlert(
  stock: {
    name: string;
    symbol: string;
    reason: string;
    targetReturn: number;
  }
): Promise<{ success: number; failed: number }> {
  return sendNotificationToPlans('vip', {
    type: 'VIP_STOCK',
    title: `👑 VIP 전용 종목 공개`,
    message: `새로운 VIP 전용 추천 종목이 있습니다.\n\n${stock.name}(${stock.symbol})\n예상 수익률: +${stock.targetReturn.toFixed(1)}%\n\n${stock.reason}`,
    data: stock,
  });
}

/**
 * 구독 관련 알림
 */
export async function sendSubscriptionNotification(
  userId: string,
  event: 'subscribed' | 'renewed' | 'expiring' | 'expired' | 'upgraded' | 'downgraded',
  planName: string,
  daysRemaining?: number
): Promise<boolean> {
  const messages: Record<string, { title: string; message: string }> = {
    subscribed: {
      title: '🎉 구독 완료!',
      message: `${planName} 플랜 구독이 완료되었습니다. 프리미엄 기능을 즐겨보세요!`,
    },
    renewed: {
      title: '✅ 구독 갱신 완료',
      message: `${planName} 플랜이 성공적으로 갱신되었습니다.`,
    },
    expiring: {
      title: '⏰ 구독 만료 예정',
      message: `${planName} 플랜이 ${daysRemaining}일 후 만료됩니다. 지속적인 혜택을 위해 갱신해주세요.`,
    },
    expired: {
      title: '😢 구독 만료',
      message: `${planName} 플랜이 만료되었습니다. 다시 구독하시면 프리미엄 기능을 이용할 수 있습니다.`,
    },
    upgraded: {
      title: '🚀 플랜 업그레이드 완료!',
      message: `${planName} 플랜으로 업그레이드되었습니다. 더 많은 기능을 이용해보세요!`,
    },
    downgraded: {
      title: '📢 플랜 변경 안내',
      message: `${planName} 플랜으로 변경되었습니다. 다음 결제일부터 적용됩니다.`,
    },
  };

  const { title, message } = messages[event];

  const result = await createNotification({
    user_id: userId,
    type: 'SUBSCRIPTION',
    title,
    message,
    data: { event, planName, daysRemaining },
  });

  return result.success;
}

// ==================== 알림 설정 관리 ====================

export interface NotificationPreferences {
  morning_briefing: boolean;
  price_alerts: boolean;
  trading_signals: boolean;
  vip_stocks: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  morning_briefing: true,
  price_alerts: true,
  trading_signals: true,
  vip_stocks: true,
  email_enabled: false,
  push_enabled: true,
};

/**
 * 알림 설정 조회
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('notification_settings')
    .eq('user_id', userId)
    .single();

  if (error || !data?.notification_settings) {
    return DEFAULT_PREFERENCES;
  }

  return { ...DEFAULT_PREFERENCES, ...data.notification_settings };
}

/**
 * 알림 설정 업데이트
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const current = await getNotificationPreferences(userId);
    const updated = { ...current, ...preferences };

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        notification_settings: updated,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return false;
  }
}
