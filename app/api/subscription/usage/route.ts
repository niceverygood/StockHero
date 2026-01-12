// 기능 사용량 조회 및 체크 API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  checkFeatureUsage, 
  incrementFeatureUsage,
  getUserTier 
} from '@/lib/subscription/service';
import { FEATURE_LIMITS } from '@/lib/subscription/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 사용량 조회
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const featureKey = url.searchParams.get('feature');

    if (featureKey) {
      // 특정 기능 사용량만 조회
      const usage = await checkFeatureUsage(user.id, featureKey);
      return NextResponse.json(usage);
    }

    // 전체 기능 사용량 조회
    const tier = await getUserTier(user.id);
    const today = new Date().toISOString().split('T')[0];

    const { data: usages } = await supabase
      .from('feature_usage')
      .select('feature_key, usage_count')
      .eq('user_id', user.id)
      .eq('usage_date', today);

    const usageMap = new Map(
      (usages || []).map(u => [u.feature_key, u.usage_count])
    );

    const allUsage: Record<string, {
      currentUsage: number;
      limit: number;
      canUse: boolean;
    }> = {};

    for (const [key, feature] of Object.entries(FEATURE_LIMITS)) {
      const limit = feature[tier] as number;
      const currentUsage = usageMap.get(key) || 0;
      
      allUsage[key] = {
        currentUsage,
        limit: typeof limit === 'number' ? limit : 0,
        canUse: limit === -1 || (typeof limit === 'number' && currentUsage < limit),
      };
    }

    return NextResponse.json({
      tier,
      usage: allUsage,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: 사용량 증가
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { featureKey } = body as { featureKey: string };

    if (!featureKey) {
      return NextResponse.json(
        { error: 'Feature key is required' },
        { status: 400 }
      );
    }

    // 사용 가능 여부 확인
    const usage = await checkFeatureUsage(user.id, featureKey);
    
    if (!usage.canUse) {
      return NextResponse.json(
        { 
          error: '일일 사용 한도에 도달했습니다.',
          currentUsage: usage.currentUsage,
          limit: usage.limit,
          canUse: false,
        },
        { status: 403 }
      );
    }

    // 사용량 증가
    const newCount = await incrementFeatureUsage(user.id, featureKey);

    return NextResponse.json({
      success: true,
      currentUsage: newCount,
      limit: usage.limit,
      canUse: usage.limit === -1 || newCount < usage.limit,
    });
  } catch (error) {
    console.error('Usage increment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






