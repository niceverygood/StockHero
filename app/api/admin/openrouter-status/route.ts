export const dynamic = 'force-dynamic';
/**
 * OpenRouter API 키 동작 여부 및 크레딧 확인 (관리자 전용)
 * - 크레딧 조회는 Management Key일 때만 가능 (일반 키는 403)
 * - 실제 1회 호출 테스트로 키/한도 확인
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdmin } from '@/lib/admin/config';
import { VERDICT_MODELS, callOpenRouterCompletion } from '@/lib/llm/openrouter-verdict';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        error: 'OPENROUTER_API_KEY not set',
        credits: null,
        keyWorks: false,
        testError: '키가 환경변수에 없습니다.',
      });
    }

    // 1) 크레딧 조회 (Management Key면 성공, 일반 키면 403)
    let credits: { total_credits?: number; total_usage?: number } | null = null;
    let creditsError: string | null = null;
    try {
      const credRes = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (credRes.ok) {
        const data = await credRes.json();
        credits = data?.data ?? data ?? null;
      } else {
        const text = await credRes.text();
        creditsError = `HTTP ${credRes.status}: ${text.slice(0, 200)}`;
      }
    } catch (e: any) {
      creditsError = e?.message || String(e);
    }

    // 2) 실제 1회 짧은 호출로 키/한도 확인 (402 결제필요, 429 한도초과 등)
    let keyWorks = false;
    let testError: string | null = null;
    let testStatus: number | null = null;
    try {
      const reply = await callOpenRouterCompletion(
        VERDICT_MODELS.gpt,
        [{ role: 'user', content: 'Say only: OK' }],
        10
      );
      keyWorks = reply.length > 0;
    } catch (e: any) {
      testError = e?.message || String(e);
      // OpenRouter 에러 메시지에서 결제/한도 힌트 추출
      if (e?.message?.includes('402') || testError?.toLowerCase().includes('payment')) testStatus = 402;
      if (e?.message?.includes('429') || testError?.toLowerCase().includes('rate')) testStatus = 429;
    }

    return NextResponse.json({
      ok: keyWorks,
      keyWorks,
      credits,
      creditsError: creditsError || undefined,
      testError: testError || undefined,
      testStatus: testStatus || undefined,
      hint: !keyWorks && testError
        ? '키 만료/한도 초과 또는 모델 접근 권한이 없을 수 있습니다. OpenRouter 대시보드에서 확인하세요.'
        : keyWorks
          ? 'API 키 정상 동작 중입니다.'
          : undefined,
    });
  } catch (error: any) {
    console.error('OpenRouter status error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to check OpenRouter status' },
      { status: 500 }
    );
  }
}
