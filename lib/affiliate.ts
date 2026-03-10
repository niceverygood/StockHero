/**
 * StockHero 어필리에이트 시스템 공통 유틸리티
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// 서버사이드 Supabase Admin Client (service_role_key)
// =====================================================

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    
    supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// =====================================================
// 추천코드 생성 (영문대문자 + 숫자, 8자리)
// =====================================================

export function generateReferralCode(name: string): string {
  // 이름에서 영문/한글 추출하여 4자 접두사 생성
  const prefix = name
    .replace(/[^a-zA-Z가-힣]/g, '')
    .substring(0, 4)
    .toUpperCase() || 'HERO';
  
  // 랜덤 4자리 접미사 생성
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}_${suffix}`;
}

// 추천코드 유효성 검사
export function isValidReferralCode(code: string): boolean {
  // 형식: XXXX_XXXX (영문+숫자, 언더스코어로 구분)
  const pattern = /^[A-Z가-힣0-9]{1,10}_[A-Z0-9]{4}$/;
  return pattern.test(code);
}

// =====================================================
// 티어 설정
// =====================================================

export const TIER_CONFIG = {
  bronze: { 
    min: 0, 
    max: 30, 
    rate: 20, 
    label: '브론즈', 
    color: 'text-amber-700', 
    bg: 'bg-amber-700/20',
    icon: '🥉'
  },
  silver: { 
    min: 31, 
    max: 100, 
    rate: 25, 
    label: '실버', 
    color: 'text-gray-300', 
    bg: 'bg-gray-300/20',
    icon: '🥈'
  },
  gold: { 
    min: 101, 
    max: 300, 
    rate: 30, 
    label: '골드', 
    color: 'text-amber-400', 
    bg: 'bg-amber-400/20',
    icon: '🥇'
  },
  diamond: { 
    min: 301, 
    max: Infinity, 
    rate: 35, 
    label: '다이아몬드', 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-400/20',
    icon: '💎'
  },
} as const;

export type TierType = keyof typeof TIER_CONFIG;

// 티어 계산
export function calculateTier(totalReferrals: number): TierType {
  if (totalReferrals >= 301) return 'diamond';
  if (totalReferrals >= 101) return 'gold';
  if (totalReferrals >= 31) return 'silver';
  return 'bronze';
}

// 다음 티어까지 남은 추천 수 계산
export function getReferralsToNextTier(currentReferrals: number): { 
  nextTier: TierType | null; 
  remaining: number; 
  progress: number;
} {
  const tier = calculateTier(currentReferrals);
  const config = TIER_CONFIG[tier];
  
  if (tier === 'diamond') {
    return { nextTier: null, remaining: 0, progress: 100 };
  }
  
  const nextTiers: Record<TierType, TierType | null> = {
    bronze: 'silver',
    silver: 'gold',
    gold: 'diamond',
    diamond: null,
  };
  
  const nextTier = nextTiers[tier];
  if (!nextTier) return { nextTier: null, remaining: 0, progress: 100 };
  
  const nextConfig = TIER_CONFIG[nextTier];
  const remaining = nextConfig.min - currentReferrals;
  const range = nextConfig.min - config.min;
  const progress = Math.round(((currentReferrals - config.min) / range) * 100);
  
  return { nextTier, remaining, progress: Math.max(0, Math.min(100, progress)) };
}

// =====================================================
// 인증 헬퍼 함수 (API 라우트용)
// =====================================================

// Authorization 헤더에서 유저 가져오기
export async function getAuthUser(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// 쿠키에서 유저 가져오기
export async function getAuthUserFromCookies(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    
    // 쿠키에서 access_token 추출
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
      })
    );
    
    // Supabase auth 쿠키 패턴들
    let accessToken = cookies['sb-access-token'];
    
    // 다른 패턴 시도
    if (!accessToken) {
      const authTokenCookie = Object.entries(cookies).find(([k]) => 
        k.includes('auth-token') || k.includes('sb-') && k.includes('-auth')
      );
      if (authTokenCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(authTokenCookie[1]));
          accessToken = parsed.access_token;
        } catch {
          accessToken = authTokenCookie[1];
        }
      }
    }
    
    if (!accessToken) return null;
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// Bearer 토큰 또는 쿠키에서 유저 가져오기 (통합)
export async function getCurrentUser(request: Request) {
  // 먼저 Bearer 토큰 시도
  let user = await getAuthUser(request);
  
  // 실패하면 쿠키 시도
  if (!user) {
    user = await getAuthUserFromCookies(request);
  }
  
  return user;
}

// =====================================================
// 관리자 체크
// =====================================================

// 관리자 이메일 목록 (환경변수 또는 기본값)
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@stockhero.app').split(',').map(e => e.trim());

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

// =====================================================
// 운영자 상태 라벨
// =====================================================

export const OPERATOR_STATUS_LABELS = {
  pending: { label: '승인 대기', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  active: { label: '활성', color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
  suspended: { label: '정지', color: 'text-red-400', bg: 'bg-red-400/20' },
} as const;

export type OperatorStatus = keyof typeof OPERATOR_STATUS_LABELS;

// =====================================================
// 금액 포맷팅
// =====================================================

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// 은행 목록
// =====================================================

export const BANK_LIST = [
  'KB국민',
  '신한',
  '하나',
  '우리',
  'NH농협',
  '기업',
  'SC제일',
  '씨티',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
] as const;

export type BankName = typeof BANK_LIST[number];

// =====================================================
// 타입 정의
// =====================================================

export interface Operator {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate: number;
  tier: TierType;
  channel_name: string | null;
  channel_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  status: OperatorStatus;
  total_referrals: number;
  total_active_subscribers: number;
  total_earnings: number;
  pending_payout: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  operator_id: string;
  user_id: string;
  referral_code: string;
  created_at: string;
}

export interface Commission {
  id: string;
  operator_id: string;
  subscription_id: string | null;
  user_id: string | null;
  amount: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  created_at: string;
}
