-- User Portfolio (extracted from HTS/MTS screenshots)
CREATE TABLE IF NOT EXISTS user_portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- User Portfolio Holdings (individual stocks)
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

-- Enable RLS
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Policies for user_portfolios
CREATE POLICY "Users can view their own portfolios" ON user_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own portfolios" ON user_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolios" ON user_portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolios" ON user_portfolios FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_portfolio_holdings
CREATE POLICY "Users can view holdings of their portfolios" ON user_portfolio_holdings 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert holdings to their portfolios" ON user_portfolio_holdings 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update holdings of their portfolios" ON user_portfolio_holdings 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete holdings from their portfolios" ON user_portfolio_holdings 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_user_portfolios_updated_at
  BEFORE UPDATE ON user_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_portfolio_holdings_updated_at
  BEFORE UPDATE ON user_portfolio_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();





