export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSymbols } from '@/lib/supabase';

export async function GET() {
  try {
    const symbols = await getSymbols();
    
    return NextResponse.json({
      success: true,
      data: symbols.map(s => ({
        code: s.code,
        name: s.name,
        sector: s.sector,
        market: s.market,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch symbols:', error);
    
    // Fallback to mock data if Supabase fails
    const mockSymbols = [
      { code: '005930', name: '삼성전자', sector: '반도체', market: 'KOSPI' },
      { code: '000660', name: 'SK하이닉스', sector: '반도체', market: 'KOSPI' },
      { code: '373220', name: 'LG에너지솔루션', sector: '2차전지', market: 'KOSPI' },
      { code: '207940', name: '삼성바이오로직스', sector: '바이오', market: 'KOSPI' },
      { code: '005380', name: '현대차', sector: '자동차', market: 'KOSPI' },
      { code: '006400', name: '삼성SDI', sector: '2차전지', market: 'KOSPI' },
      { code: '035720', name: '카카오', sector: 'IT서비스', market: 'KOSPI' },
      { code: '035420', name: 'NAVER', sector: 'IT서비스', market: 'KOSPI' },
    ];
    
    return NextResponse.json({
      success: true,
      data: mockSymbols,
    });
  }
}
