-- User Features Schema
-- 마이페이지 관련 테이블들

-- 1. 토론 시청 기록 (Debate Watch History)
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

-- 2. AI 상담 기록 (Consultation History)
CREATE TABLE IF NOT EXISTS user_consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  character_type VARCHAR(20) NOT NULL, -- claude, gemini, gpt
  topic VARCHAR(200), -- 상담 주제 (첫 번째 질문 요약)
  messages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 상담 메시지 기록
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL REFERENCES user_consultations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 관심 종목 (Watchlist/Bookmarks)
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

-- 5. 사용자 설정 (User Preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  preferred_analyst VARCHAR(20) DEFAULT 'claude', -- claude, gemini, gpt
  notification_enabled BOOLEAN DEFAULT TRUE,
  email_digest BOOLEAN DEFAULT FALSE,
  dark_mode BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 활동 통계 (Activity Stats - cached)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_debate_history_user ON user_debate_history(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_history_session ON user_debate_history(session_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON user_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_messages ON consultation_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);

-- Enable RLS
ALTER TABLE user_debate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own debate history" ON user_debate_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debate history" ON user_debate_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debate history" ON user_debate_history
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debate history" ON user_debate_history
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own consultations" ON user_consultations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consultations" ON user_consultations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consultations" ON user_consultations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own consultations" ON user_consultations
  FOR DELETE USING (auth.uid() = user_id);

-- Consultation messages inherit access from parent consultation
CREATE POLICY "Users can view own consultation messages" ON consultation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_consultations 
      WHERE id = consultation_messages.consultation_id 
      AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own consultation messages" ON consultation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_consultations 
      WHERE id = consultation_messages.consultation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own watchlist" ON user_watchlist
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own activity stats" ON user_activity_stats
  FOR ALL USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access debate_history" ON user_debate_history
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access consultations" ON user_consultations
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access consultation_messages" ON consultation_messages
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access watchlist" ON user_watchlist
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access preferences" ON user_preferences
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access activity_stats" ON user_activity_stats
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON user_consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_stats_updated_at
  BEFORE UPDATE ON user_activity_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();








