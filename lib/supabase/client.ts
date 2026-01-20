import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 클라이언트 사이드에서만 환경변수를 읽음
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

// Singleton 클라이언트 인스턴스
let supabaseInstance: SupabaseClient | null = null;

// Client-side Supabase client (uses anon key)
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = getSupabaseConfig();
  if (!config) {
    console.warn('Supabase environment variables not configured');
    return null;
  }

  supabaseInstance = createClient(config.url, config.key);
  return supabaseInstance;
}

// 레거시 호환성을 위한 export (null일 수 있음)
export const supabase = getSupabaseClient();

// For browser usage
export function createBrowserClient(): SupabaseClient | null {
  return getSupabaseClient();
}


