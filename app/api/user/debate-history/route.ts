export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Record a debate view
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
    const { sessionId, symbolCode, symbolName, watchedRounds, totalRounds } = body;

    if (!symbolCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('user_debate_history')
      .select('id, watched_rounds')
      .eq('user_id', user.id)
      .eq('symbol_code', symbolCode)
      .single();

    if (existing) {
      // Update existing record
      const newWatchedRounds = Math.max(existing.watched_rounds, watchedRounds || 1);
      const { data, error } = await supabase
        .from('user_debate_history')
        .update({
          watched_rounds: newWatchedRounds,
          total_rounds: totalRounds || 4,
          completed: newWatchedRounds >= (totalRounds || 4),
          last_watched_at: new Date().toISOString(),
          session_id: sessionId,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('user_debate_history')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          symbol_code: symbolCode,
          symbol_name: symbolName,
          watched_rounds: watchedRounds || 1,
          total_rounds: totalRounds || 4,
          completed: (watchedRounds || 1) >= (totalRounds || 4),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error recording debate history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record debate history' },
      { status: 500 }
    );
  }
}

// Get debate history for current user
export async function GET(request: NextRequest) {
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
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data, error } = await supabase
      .from('user_debate_history')
      .select('*')
      .eq('user_id', user.id)
      .order('last_watched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data: data?.map(item => ({
        id: item.id,
        sessionId: item.session_id,
        symbolCode: item.symbol_code,
        symbolName: item.symbol_name,
        watchedRounds: item.watched_rounds,
        totalRounds: item.total_rounds,
        completed: item.completed,
        lastWatchedAt: item.last_watched_at,
        createdAt: item.created_at,
      })) || []
    });
  } catch (error) {
    console.error('Error fetching debate history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debate history' },
      { status: 500 }
    );
  }
}
