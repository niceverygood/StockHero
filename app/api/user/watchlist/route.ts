export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Add to watchlist
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

    const body = await request.json();
    const { symbolCode, symbolName, memo } = body;

    if (!symbolCode || !symbolName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from('user_watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('symbol_code', symbolCode)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Already in watchlist' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('user_watchlist')
      .insert({
        user_id: user.id,
        symbol_code: symbolCode,
        symbol_name: symbolName,
        memo,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

// Get watchlist
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

    const { data, error } = await supabase
      .from('user_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: data?.map(item => ({
        id: item.id,
        symbolCode: item.symbol_code,
        symbolName: item.symbol_name,
        memo: item.memo,
        alertEnabled: item.alert_enabled,
        createdAt: item.created_at,
      })) || []
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

// Remove from watchlist
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
    const symbolCode = searchParams.get('symbolCode');

    if (!symbolCode) {
      return NextResponse.json(
        { success: false, error: 'Symbol Code required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol_code', symbolCode);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
