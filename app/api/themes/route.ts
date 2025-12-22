import { NextResponse } from 'next/server';
import { HOT_THEMES } from '@/lib/data/hot-themes';

export async function GET() {
  // 테마 목록 반환 (주식 정보 제외하고 기본 정보만)
  const themes = HOT_THEMES.map(theme => ({
    id: theme.id,
    name: theme.name,
    nameEn: theme.nameEn,
    icon: theme.icon,
    color: theme.color,
    bgColor: theme.bgColor,
    description: theme.description,
    trend: theme.trend,
    stockCount: {
      kr: theme.stocks.filter(s => s.market === 'KR').length,
      us: theme.stocks.filter(s => s.market === 'US').length,
    },
  }));

  return NextResponse.json({
    themes,
    updatedAt: new Date().toISOString(),
  });
}



