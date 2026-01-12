import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // 한국 시간 기준 오늘 날짜
  const now = new Date();
  const kstOffset = 9 * 60; // UTC+9
  const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
  const today = kstTime.toISOString().split('T')[0];

  try {
    // 오늘 verdict 삭제
    const { error } = await supabase
      .from('verdicts')
      .delete()
      .eq('date', today);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Deleted verdict for ${today}`,
      date: today 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


