-- StockHero Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_debate_sessions_date ON debate_sessions(date);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_symbol ON debate_sessions(symbol_code);
CREATE INDEX IF NOT EXISTS idx_debate_messages_session ON debate_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(date);
CREATE INDEX IF NOT EXISTS idx_predictions_verdict ON predictions(verdict_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_prediction ON outcomes(prediction_id);

-- Enable Row Level Security (RLS)
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no auth required for reading)
CREATE POLICY "Allow public read access on symbols" ON symbols FOR SELECT USING (true);
CREATE POLICY "Allow public read access on debate_sessions" ON debate_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on debate_messages" ON debate_messages FOR SELECT USING (true);
CREATE POLICY "Allow public read access on verdicts" ON verdicts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read access on outcomes" ON outcomes FOR SELECT USING (true);

-- Create policies for service role insert/update/delete
CREATE POLICY "Allow service role full access on symbols" ON symbols FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on debate_sessions" ON debate_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on debate_messages" ON debate_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on verdicts" ON verdicts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on predictions" ON predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on outcomes" ON outcomes FOR ALL USING (auth.role() = 'service_role');

-- Insert sample symbols (Korean stocks)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_symbols_updated_at
  BEFORE UPDATE ON symbols
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debate_sessions_updated_at
  BEFORE UPDATE ON debate_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();





