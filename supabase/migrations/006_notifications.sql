-- =====================================================
-- 알림 시스템 테이블
-- =====================================================

-- notifications 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL, -- 'MORNING_BRIEFING', 'PRICE_SURGE', 'PRICE_DROP', 'BUY_SIGNAL', 'SELL_SIGNAL', 'VIP_STOCK', 'SUBSCRIPTION', 'SYSTEM'
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb, -- 추가 데이터 (종목 정보 등)
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- 서비스 역할은 모든 작업 가능 (알림 생성용)
CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 알림 설정 테이블 (user_preferences 확장)
-- =====================================================

-- user_preferences 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS user_preferences (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    notification_settings jsonb DEFAULT '{
        "morning_briefing": true,
        "price_alerts": true,
        "trading_signals": true,
        "vip_stocks": true,
        "email_enabled": false,
        "push_enabled": true
    }'::jsonb,
    ui_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 알림 통계 함수
-- =====================================================

-- 읽지 않은 알림 개수 조회
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    count integer;
BEGIN
    SELECT COUNT(*) INTO count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false;
    RETURN count;
END;
$$;

-- 오래된 알림 정리 (30일 이상)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    WITH deleted AS (
        DELETE FROM notifications
        WHERE created_at < now() - interval '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;

-- =====================================================
-- 알림 발송 이력 테이블 (중복 방지용)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type text NOT NULL,
    target_key text NOT NULL, -- 예: 종목코드, 사용자ID 등
    sent_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 30분 이내 중복 체크용 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_history_recent 
    ON notification_history(notification_type, target_key, sent_at DESC);

-- 7일 이상 된 이력 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_notification_history()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    WITH deleted AS (
        DELETE FROM notification_history
        WHERE sent_at < now() - interval '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$;
