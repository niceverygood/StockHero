export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin/config';

// Supabase Admin 클라이언트 (service role key 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    // 현재 사용자 확인 (Authorization 헤더에서)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 모든 사용자 조회 (auth.users + subscriptions 조인)
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // 구독 정보 조회
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    // 사용자 목록과 구독 정보 매핑
    const users = authUsers.users.map(u => {
      const subscription = subscriptions?.find(s => s.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        subscription: subscription ? {
          tier: subscription.tier,
          is_active: subscription.is_active,
          expires_at: subscription.expires_at,
          started_at: subscription.started_at,
        } : null,
      };
    });

    // 최근 가입 순으로 정렬
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
