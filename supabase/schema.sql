-- =====================================================
-- StockHero Complete Database Schema
-- Supabase SQL Editor에서 한 번에 실행하세요
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Core Tables (Symbols, Debates, Predictions)
-- =====================================================

-- Symbols table (stocks)
CREATE TABLE IF NOT EXISTS symbols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  sector VARCHAR(50),
  market VARCHAR(20) DEFAULT 'KOSPI',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debate sessions table
CREATE TABLE IF NOT EXISTS debate_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol_code VARCHAR(20) NOT NULL,
  symbol_name VARCHAR(100) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'running',
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debate messages table
CREATE TABLE IF NOT EXISTS debate_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES debate_sessions(id) ON DELETE CASCADE,
  character VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  score INTEGER DEFAULT 3,
  risks JSONB DEFAULT '[]',
  sources JSONB DEFAULT '[]',
  round INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verdicts table (daily Top 5)
CREATE TABLE IF NOT EXISTS verdicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE DEFAULT CURRENT_DATE UNIQUE,
  top5 JSONB NOT NULL,
  consensus_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verdict_id UUID NOT NULL REFERENCES verdicts(id) ON DELETE CASCADE,
  symbol_code VARCHAR(20) NOT NULL,
  symbol_name VARCHAR(100) NOT NULL,
  predicted_direction VARCHAR(10) NOT NULL,
  avg_score DECIMAL(3,2) DEFAULT 3.0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcomes table (actual results)
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  actual_direction VARCHAR(10) NOT NULL,
  actual_return DECIMAL(10,4) DEFAULT 0,
  is_hit BOOLEAN DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. User Feature Tables
-- =====================================================

-- User Portfolios (HTS/MTS screenshots)
CREATE TABLE IF NOT EXISTS user_portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(100) DEFAULT '내 포트폴리오',
  total_value DECIMAL(15, 2) DEFAULT 0,
  total_invested DECIMAL(15, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  profit_rate DECIMAL(8, 4) DEFAULT 0,
  screenshot_url TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Portfolio Holdings
CREATE TABLE IF NOT EXISTS user_portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES user_portfolios(id) ON DELETE CASCADE,
  symbol_code VARCHAR(20) NOT NULL,
  symbol_name VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_price DECIMAL(15, 2) DEFAULT 0,
  current_price DECIMAL(15, 2) DEFAULT 0,
  total_value DECIMAL(15, 2) DEFAULT 0,
  profit DECIMAL(15, 2) DEFAULT 0,
  profit_rate DECIMAL(8, 4) DEFAULT 0,
  weight DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Debate History
CREATE TABLE IF NOT EXISTS user_debate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES debate_sessions(id) ON DELETE CASCADE,
  symbol_code VARCHAR(20) NOT NULL,
  symbol_name VARCHAR(100) NOT NULL,
  watched_rounds INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 4,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Consultations
CREATE TABLE IF NOT EXISTS user_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  character_type VARCHAR(20) NOT NULL,
  topic VARCHAR(200),
  messages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consultation Messages
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES user_consultations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Watchlist
CREATE TABLE IF NOT EXISTS user_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  symbol_code VARCHAR(20) NOT NULL,
  symbol_name VARCHAR(100) NOT NULL,
  memo TEXT,
  alert_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol_code)
);

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  preferred_analyst VARCHAR(20) DEFAULT 'claude',
  notification_enabled BOOLEAN DEFAULT TRUE,
  email_digest BOOLEAN DEFAULT FALSE,
  dark_mode BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Stats
CREATE TABLE IF NOT EXISTS user_activity_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  total_debates_watched INTEGER DEFAULT 0,
  total_consultations INTEGER DEFAULT 0,
  total_watchlist_items INTEGER DEFAULT 0,
  favorite_sector VARCHAR(50),
  most_discussed_stock VARCHAR(100),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. Community Tables
-- =====================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  website VARCHAR(255),
  twitter_handle VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow Relationships
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Posts/Feeds
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  post_type VARCHAR(20) DEFAULT 'text',
  shared_portfolio_id UUID REFERENCES user_portfolios(id) ON DELETE SET NULL,
  shared_watchlist_items JSONB,
  shared_stock_code VARCHAR(20),
  shared_stock_name VARCHAR(100),
  image_urls JSONB DEFAULT '[]'::jsonb,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

-- Post Bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type VARCHAR(50) NOT NULL,
  reference_id UUID,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_debate_sessions_date ON debate_sessions(date);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_symbol ON debate_sessions(symbol_code);
CREATE INDEX IF NOT EXISTS idx_debate_messages_session ON debate_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(date);
CREATE INDEX IF NOT EXISTS idx_predictions_verdict ON predictions(verdict_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_prediction ON outcomes(prediction_id);

CREATE INDEX IF NOT EXISTS idx_portfolios_user ON user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio ON user_portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_debate_history_user ON user_debate_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON user_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- 5. Row Level Security
-- =====================================================

ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_debate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Public read access for core tables
DROP POLICY IF EXISTS "public_read_symbols" ON symbols;
CREATE POLICY "public_read_symbols" ON symbols FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_debate_sessions" ON debate_sessions;
CREATE POLICY "public_read_debate_sessions" ON debate_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_debate_messages" ON debate_messages;
CREATE POLICY "public_read_debate_messages" ON debate_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_verdicts" ON verdicts;
CREATE POLICY "public_read_verdicts" ON verdicts FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_predictions" ON predictions;
CREATE POLICY "public_read_predictions" ON predictions FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_outcomes" ON outcomes;
CREATE POLICY "public_read_outcomes" ON outcomes FOR SELECT USING (true);

-- User portfolios
DROP POLICY IF EXISTS "users_own_portfolios" ON user_portfolios;
CREATE POLICY "users_own_portfolios" ON user_portfolios FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_own_holdings" ON user_portfolio_holdings;
CREATE POLICY "users_own_holdings" ON user_portfolio_holdings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
);

-- User features
DROP POLICY IF EXISTS "users_own_debate_history" ON user_debate_history;
CREATE POLICY "users_own_debate_history" ON user_debate_history FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_own_consultations" ON user_consultations;
CREATE POLICY "users_own_consultations" ON user_consultations FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_own_consultation_messages" ON consultation_messages;
CREATE POLICY "users_own_consultation_messages" ON consultation_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM user_consultations WHERE id = consultation_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "users_own_watchlist" ON user_watchlist;
CREATE POLICY "users_own_watchlist" ON user_watchlist FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_own_preferences" ON user_preferences;
CREATE POLICY "users_own_preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_own_activity_stats" ON user_activity_stats;
CREATE POLICY "users_own_activity_stats" ON user_activity_stats FOR ALL USING (auth.uid() = user_id);

-- User profiles (public read, owner write)
DROP POLICY IF EXISTS "public_read_profiles" ON user_profiles;
CREATE POLICY "public_read_profiles" ON user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follows (public read, authenticated write)
DROP POLICY IF EXISTS "public_read_follows" ON user_follows;
CREATE POLICY "public_read_follows" ON user_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_manage_follows" ON user_follows;
CREATE POLICY "users_manage_follows" ON user_follows FOR ALL USING (auth.uid() = follower_id);

-- Posts (public read if not hidden, owner manage)
DROP POLICY IF EXISTS "public_read_posts" ON posts;
CREATE POLICY "public_read_posts" ON posts FOR SELECT USING (NOT is_hidden);
DROP POLICY IF EXISTS "users_manage_own_posts" ON posts;
CREATE POLICY "users_manage_own_posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_update_own_posts" ON posts;
CREATE POLICY "users_update_own_posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_delete_own_posts" ON posts;
CREATE POLICY "users_delete_own_posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Likes (public read, auth manage own)
DROP POLICY IF EXISTS "public_read_likes" ON post_likes;
CREATE POLICY "public_read_likes" ON post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_manage_own_likes" ON post_likes;
CREATE POLICY "users_manage_own_likes" ON post_likes FOR ALL USING (auth.uid() = user_id);

-- Comments (public read, auth manage own)
DROP POLICY IF EXISTS "public_read_comments" ON post_comments;
CREATE POLICY "public_read_comments" ON post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_manage_own_comments" ON post_comments;
CREATE POLICY "users_manage_own_comments" ON post_comments FOR ALL USING (auth.uid() = user_id);

-- Comment likes
DROP POLICY IF EXISTS "public_read_comment_likes" ON comment_likes;
CREATE POLICY "public_read_comment_likes" ON comment_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "users_manage_comment_likes" ON comment_likes;
CREATE POLICY "users_manage_comment_likes" ON comment_likes FOR ALL USING (auth.uid() = user_id);

-- Bookmarks (owner only)
DROP POLICY IF EXISTS "users_own_bookmarks" ON post_bookmarks;
CREATE POLICY "users_own_bookmarks" ON post_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Notifications (owner read, anyone insert)
DROP POLICY IF EXISTS "users_own_notifications" ON notifications;
CREATE POLICY "users_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "anyone_create_notifications" ON notifications;
CREATE POLICY "anyone_create_notifications" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 7. Functions & Triggers
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_symbols_updated_at ON symbols;
CREATE TRIGGER update_symbols_updated_at BEFORE UPDATE ON symbols FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_debate_sessions_updated_at ON debate_sessions;
CREATE TRIGGER update_debate_sessions_updated_at BEFORE UPDATE ON debate_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON user_portfolios;
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON user_portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holdings_updated_at ON user_portfolio_holdings;
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON user_portfolio_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON user_consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON user_consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activity_stats_updated_at ON user_activity_stats;
CREATE TRIGGER update_activity_stats_updated_at BEFORE UPDATE ON user_activity_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON post_comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Follower count function
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    UPDATE user_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE user_id = OLD.following_id;
    UPDATE user_profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follower_counts ON user_follows;
CREATE TRIGGER trigger_update_follower_counts AFTER INSERT OR DELETE ON user_follows FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Post like count function
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
CREATE TRIGGER trigger_update_post_like_count AFTER INSERT OR DELETE ON post_likes FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Post comment count function
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
CREATE TRIGGER trigger_update_post_comment_count AFTER INSERT OR DELETE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- User post count function
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET post_count = GREATEST(0, post_count - 1) WHERE user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_post_count ON posts;
CREATE TRIGGER trigger_update_user_post_count AFTER INSERT OR DELETE ON posts FOR EACH ROW EXECUTE FUNCTION update_user_post_count();

-- =====================================================
-- 8. Sample Data
-- =====================================================

-- Insert sample symbols
INSERT INTO symbols (code, name, sector, market) VALUES
  ('005930', '삼성전자', '반도체', 'KOSPI'),
  ('000660', 'SK하이닉스', '반도체', 'KOSPI'),
  ('373220', 'LG에너지솔루션', '2차전지', 'KOSPI'),
  ('207940', '삼성바이오로직스', '바이오', 'KOSPI'),
  ('005380', '현대차', '자동차', 'KOSPI'),
  ('006400', '삼성SDI', '2차전지', 'KOSPI'),
  ('035720', '카카오', 'IT서비스', 'KOSPI'),
  ('035420', 'NAVER', 'IT서비스', 'KOSPI'),
  ('051910', 'LG화학', '화학', 'KOSPI'),
  ('000270', '기아', '자동차', 'KOSPI'),
  ('105560', 'KB금융', '금융', 'KOSPI'),
  ('055550', '신한지주', '금융', 'KOSPI'),
  ('096770', 'SK이노베이션', '에너지', 'KOSPI'),
  ('034730', 'SK', '지주', 'KOSPI'),
  ('003550', 'LG', '지주', 'KOSPI'),
  ('066570', 'LG전자', '가전', 'KOSPI'),
  ('028260', '삼성물산', '건설', 'KOSPI'),
  ('012330', '현대모비스', '자동차부품', 'KOSPI'),
  ('068270', '셀트리온', '바이오', 'KOSPI'),
  ('003670', '포스코홀딩스', '철강', 'KOSPI')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 완료!
-- =====================================================





