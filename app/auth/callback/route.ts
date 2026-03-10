import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  let userId: string | null = null;

  if (code) {
    const supabase = createServerClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    userId = data?.session?.user?.id || null;
  }

  // 추천코드가 있는 경우 적용 페이지로 리다이렉트
  // (클라이언트에서 localStorage의 pending_referral_code를 확인하고 적용)
  // 추천코드 적용은 클라이언트 사이드에서 처리 (localStorage 접근 필요)
  
  // 쿠키에서 redirect URL 확인 (있으면 해당 URL로, 없으면 홈으로)
  const redirectTo = request.cookies.get('auth_redirect')?.value || '/';
  
  const response = NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
  
  // redirect 쿠키 삭제
  response.cookies.delete('auth_redirect');
  
  return response;
}








