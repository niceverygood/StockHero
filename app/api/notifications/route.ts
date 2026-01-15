// =====================================================
// 알림 API - 조회/읽음 처리
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationType,
  NOTIFICATION_PLAN_REQUIREMENTS,
} from '@/lib/notification-service';
import { getSubscriptionInfo, PLAN_LIMITS, type PlanName } from '@/lib/subscription/guard';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 플랜 순서
const PLAN_ORDER: PlanName[] = ['free', 'basic', 'pro', 'vip'];

/**
 * GET: 알림 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const subInfo = await getSubscriptionInfo(request);
    if (!subInfo || subInfo.userId === 'anonymous') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // 알림 설정 조회
    if (action === 'preferences') {
      const preferences = await getNotificationPreferences(subInfo.userId);
      return NextResponse.json({ success: true, preferences });
    }

    // 읽지 않은 알림 개수만 조회
    if (action === 'count') {
      const count = await getUnreadCount(subInfo.userId);
      return NextResponse.json({ success: true, unreadCount: count });
    }

    // 알림 목록 조회
    const notifications = await getNotifications(subInfo.userId, {
      limit,
      offset,
      unreadOnly,
    });

    const unreadCount = await getUnreadCount(subInfo.userId);

    // 사용자 플랜 확인
    const userPlanIndex = PLAN_ORDER.indexOf(subInfo.planName as PlanName);

    // 플랜별 알림 가용성 정보
    const availableTypes: NotificationType[] = Object.entries(NOTIFICATION_PLAN_REQUIREMENTS)
      .filter(([_, requiredPlan]) => userPlanIndex >= PLAN_ORDER.indexOf(requiredPlan))
      .map(([type]) => type as NotificationType);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit,
      },
      subscription: {
        plan: subInfo.planName,
        availableTypes,
        upgradeMessage: subInfo.planName === 'free' 
          ? '알림 기능을 사용하려면 베이직 플랜 이상으로 업그레이드하세요.' 
          : null,
      },
    });

  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST: 알림 읽음 처리 / 설정 업데이트
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const subInfo = await getSubscriptionInfo(request);
    if (!subInfo || subInfo.userId === 'anonymous') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, notificationIds, preferences } = body;

    // 알림 설정 업데이트
    if (action === 'update_preferences') {
      const success = await updateNotificationPreferences(subInfo.userId, preferences);
      return NextResponse.json({ success });
    }

    // 읽음 처리
    if (action === 'mark_read') {
      const success = await markAsRead(subInfo.userId, notificationIds);
      const newUnreadCount = await getUnreadCount(subInfo.userId);
      return NextResponse.json({ success, unreadCount: newUnreadCount });
    }

    // 모두 읽음 처리
    if (action === 'mark_all_read') {
      const success = await markAsRead(subInfo.userId);
      return NextResponse.json({ success, unreadCount: 0 });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 알림 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const subInfo = await getSubscriptionInfo(request);
    if (!subInfo || subInfo.userId === 'anonymous') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID required' },
        { status: 400 }
      );
    }

    const success = await deleteNotification(subInfo.userId, notificationId);
    return NextResponse.json({ success });

  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
