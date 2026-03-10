-- ============================================
-- StockHero 어필리에이트 시스템 테이블
-- 실행: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. operators (리딩방 운영자)
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','diamond')),
  channel_name VARCHAR(200),
  channel_url VARCHAR(500),
  bank_name VARCHAR(50),
  bank_account VARCHAR(50),
  bank_holder VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  total_referrals INTEGER DEFAULT 0,
  total_active_subscribers INTEGER DEFAULT 0,
  total_earnings BIGINT DEFAULT 0,
  pending_payout BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. referrals (추천 관계: 운영자 ↔ 유저)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. subscriptions (구독) - 이미 있으면 스킵
-- 기존 테이블이 있을 수 있으므로 조건부 생성
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      plan VARCHAR(20) NOT NULL CHECK (plan IN ('monthly','yearly')),
      amount INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
      payment_key VARCHAR(255),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- 4. commissions (커미션 정산)
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  subscription_id UUID,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security) 활성화
-- ============================================

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- subscriptions 테이블 RLS (이미 있을 수 있음)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    EXECUTE 'ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================
-- RLS Policies
-- ============================================

-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "operators_select_own" ON operators;
DROP POLICY IF EXISTS "operators_update_own" ON operators;
DROP POLICY IF EXISTS "referrals_select_operator" ON referrals;
DROP POLICY IF EXISTS "commissions_select_operator" ON commissions;

-- 운영자: 본인 데이터만 SELECT
CREATE POLICY "operators_select_own" ON operators 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "operators_update_own" ON operators 
  FOR UPDATE USING (user_id = auth.uid());

-- referrals: 운영자는 자기 추천 목록 조회
CREATE POLICY "referrals_select_operator" ON referrals 
  FOR SELECT USING (
    operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())
  );

-- commissions: 운영자는 자기 커미션 조회
CREATE POLICY "commissions_select_operator" ON commissions 
  FOR SELECT USING (
    operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())
  );

-- subscriptions: 본인 구독만 (기존 정책이 있을 수 있음)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
    EXECUTE 'CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- 서비스 역할용 Policies (API에서 service_role_key 사용 시)
-- service_role은 RLS를 우회하므로 별도 정책 불필요
-- ============================================

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_operators_user_id ON operators(user_id);
CREATE INDEX IF NOT EXISTS idx_operators_referral_code ON operators(referral_code);
CREATE INDEX IF NOT EXISTS idx_operators_status ON operators(status);
CREATE INDEX IF NOT EXISTS idx_operators_tier ON operators(tier);

CREATE INDEX IF NOT EXISTS idx_referrals_operator_id ON referrals(operator_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

CREATE INDEX IF NOT EXISTS idx_commissions_operator_id ON commissions(operator_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);

-- subscriptions 인덱스 (조건부)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)';
  END IF;
END $$;

-- ============================================
-- 운영자 tier 자동 계산 함수 및 트리거
-- ============================================

-- 트리거 함수: total_referrals가 변경되면 tier와 commission_rate 자동 업데이트
CREATE OR REPLACE FUNCTION update_operator_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- 다이아몬드: 301명 이상, 35%
  IF NEW.total_referrals >= 301 THEN
    NEW.tier := 'diamond';
    NEW.commission_rate := 35.00;
  -- 골드: 101~300명, 30%
  ELSIF NEW.total_referrals >= 101 THEN
    NEW.tier := 'gold';
    NEW.commission_rate := 30.00;
  -- 실버: 31~100명, 25%
  ELSIF NEW.total_referrals >= 31 THEN
    NEW.tier := 'silver';
    NEW.commission_rate := 25.00;
  -- 브론즈: 0~30명, 20%
  ELSE
    NEW.tier := 'bronze';
    NEW.commission_rate := 20.00;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_update_operator_tier ON operators;

CREATE TRIGGER trigger_update_operator_tier
  BEFORE UPDATE OF total_referrals ON operators
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_tier();

-- ============================================
-- updated_at 자동 업데이트 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- operators updated_at 트리거
DROP TRIGGER IF EXISTS trigger_operators_updated_at ON operators;
CREATE TRIGGER trigger_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 완료 메시지
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE 'StockHero 어필리에이트 시스템 테이블 생성 완료!';
  RAISE NOTICE '- operators: 리딩방 운영자';
  RAISE NOTICE '- referrals: 추천 관계';
  RAISE NOTICE '- commissions: 커미션 정산';
  RAISE NOTICE '- RLS 정책 및 인덱스 적용됨';
END $$;
