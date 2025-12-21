-- StockHero 구독 시스템 Supabase 스키마
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. 구독 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 구독 정보
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  
  -- 결제 주기
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- 기간
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- 결제 정보 (포트원)
  portone_customer_id VARCHAR(255),
  portone_billing_key VARCHAR(255),
  portone_subscription_id VARCHAR(255),
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. 결제 내역 테이블
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- 결제 정보
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  
  -- 포트원 결제 정보
  portone_payment_id VARCHAR(255),
  portone_tx_id VARCHAR(255),
  payment_method VARCHAR(50),
  
  -- 상품 정보
  plan_id VARCHAR(20) NOT NULL,
  billing_cycle VARCHAR(20),
  
  -- 영수증
  receipt_url TEXT,
  
  -- 실패 시 정보
  failure_reason TEXT,
  
  -- 메타데이터
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 기능 사용량 테이블 (일일 제한 추적)
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기능 정보
  feature_key VARCHAR(50) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  usage_date DATE DEFAULT CURRENT_DATE,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, feature_key, usage_date)
);

-- 4. 쿠폰 테이블
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  
  -- 할인 정보
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL,
  
  -- 적용 대상
  applicable_plans TEXT[] DEFAULT ARRAY['pro', 'premium'],
  
  -- 사용 제한
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- 유효 기간
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 쿠폰 사용 내역
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(coupon_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_date ON feature_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- RLS (Row Level Security) 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독만 볼 수 있음
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON feature_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own coupon redemptions" ON coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role full access subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access payments" ON payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access usage" ON feature_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 함수: 사용자 구독 티어 조회
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_tier VARCHAR;
BEGIN
  SELECT tier INTO v_tier
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW());
  
  RETURN COALESCE(v_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 기능 사용량 증가
CREATE OR REPLACE FUNCTION increment_feature_usage(p_user_id UUID, p_feature_key VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO feature_usage (user_id, feature_key, usage_count, usage_date)
  VALUES (p_user_id, p_feature_key, 1, CURRENT_DATE)
  ON CONFLICT (user_id, feature_key, usage_date)
  DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = NOW()
  RETURNING usage_count INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수: 오늘 기능 사용량 조회
CREATE OR REPLACE FUNCTION get_today_usage(p_user_id UUID, p_feature_key VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT usage_count INTO v_count
  FROM feature_usage
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
    AND usage_date = CURRENT_DATE;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

