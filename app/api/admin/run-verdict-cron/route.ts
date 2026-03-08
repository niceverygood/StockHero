export const dynamic = 'force-dynamic';
/**
 * 관리자 전용: 오늘 추천(verdict) 수동 실행
 * - OpenRouter로 AI 3대장 분석 실행 후 DB 저장
 * - production에서는 CRON_SECRET으로 내부 호출
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const baseUrl = base.startsWith('http') ? base : `https://${base}`;
    const url = `${baseUrl}/api/cron/daily-verdict?force=true&slot=morning`;
    const cronSecret = process.env.CRON_SECRET;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: cronSecret ? `Bearer ${cronSecret}` : '',
      },
      cache: 'no-store',
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || res.statusText },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Run verdict cron error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run verdict cron' },
      { status: 500 }
    );
  }
}
