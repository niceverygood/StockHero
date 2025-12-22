import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface HoldingData {
  symbolCode: string;
  symbolName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  profitRate: number;
  weight: number;
}

interface PortfolioData {
  name?: string;
  holdings: HoldingData[];
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitRate: number;
}

// GET - Fetch user's portfolio
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (portfolioError && portfolioError.code !== 'PGRST116') {
      throw portfolioError;
    }

    if (!portfolio) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Get holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('user_portfolio_holdings')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .order('weight', { ascending: false });

    if (holdingsError) {
      throw holdingsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: portfolio.id,
        name: portfolio.name,
        totalValue: portfolio.total_value,
        totalInvested: portfolio.total_invested,
        totalProfit: portfolio.total_profit,
        profitRate: portfolio.profit_rate,
        analyzedAt: portfolio.analyzed_at,
        holdings: holdings?.map(h => ({
          id: h.id,
          symbolCode: h.symbol_code,
          symbolName: h.symbol_name,
          quantity: h.quantity,
          avgPrice: h.avg_price,
          currentPrice: h.current_price,
          totalValue: h.total_value,
          profit: h.profit,
          profitRate: h.profit_rate,
          weight: h.weight,
        })) || [],
      },
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// POST - Save/Update user's portfolio
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: PortfolioData = await request.json();
    const { name = '내 포트폴리오', holdings, totalValue, totalInvested, totalProfit, profitRate } = body;

    // Check if portfolio exists
    const { data: existingPortfolio } = await supabase
      .from('user_portfolios')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single();

    let portfolioId: string;

    if (existingPortfolio) {
      // Update existing portfolio
      const { error: updateError } = await supabase
        .from('user_portfolios')
        .update({
          total_value: totalValue,
          total_invested: totalInvested,
          total_profit: totalProfit,
          profit_rate: profitRate,
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', existingPortfolio.id);

      if (updateError) throw updateError;
      portfolioId = existingPortfolio.id;

      // Delete existing holdings
      await supabase
        .from('user_portfolio_holdings')
        .delete()
        .eq('portfolio_id', portfolioId);
    } else {
      // Create new portfolio
      const { data: newPortfolio, error: insertError } = await supabase
        .from('user_portfolios')
        .insert({
          user_id: user.id,
          name,
          total_value: totalValue,
          total_invested: totalInvested,
          total_profit: totalProfit,
          profit_rate: profitRate,
          analyzed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      portfolioId = newPortfolio.id;
    }

    // Insert holdings
    if (holdings && holdings.length > 0) {
      const holdingsToInsert = holdings.map(h => ({
        portfolio_id: portfolioId,
        symbol_code: h.symbolCode,
        symbol_name: h.symbolName,
        quantity: h.quantity,
        avg_price: h.avgPrice,
        current_price: h.currentPrice,
        total_value: h.totalValue,
        profit: h.profit,
        profit_rate: h.profitRate,
        weight: h.weight,
      }));

      const { error: holdingsError } = await supabase
        .from('user_portfolio_holdings')
        .insert(holdingsToInsert);

      if (holdingsError) throw holdingsError;
    }

    return NextResponse.json({
      success: true,
      data: { portfolioId },
    });
  } catch (error) {
    console.error('Save portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save portfolio' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user's portfolio
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (!portfolioId) {
      return NextResponse.json(
        { success: false, error: 'Portfolio ID required' },
        { status: 400 }
      );
    }

    // Delete portfolio (holdings will cascade)
    const { error } = await supabase
      .from('user_portfolios')
      .delete()
      .eq('id', portfolioId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}





