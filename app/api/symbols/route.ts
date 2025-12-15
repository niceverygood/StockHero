import { NextResponse } from 'next/server';

// Mock symbols data (in production, this would come from DB)
const MOCK_SYMBOLS = [
  { id: '1', symbol: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  { id: '2', symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  { id: '3', symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지' },
  { id: '4', symbol: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { id: '5', symbol: '005380', name: '현대차', market: 'KOSPI', sector: '자동차' },
  { id: '6', symbol: '006400', name: '삼성SDI', market: 'KOSPI', sector: '2차전지' },
  { id: '7', symbol: '035720', name: '카카오', market: 'KOSPI', sector: 'IT서비스' },
  { id: '8', symbol: '035420', name: 'NAVER', market: 'KOSPI', sector: 'IT서비스' },
  { id: '9', symbol: '051910', name: 'LG화학', market: 'KOSPI', sector: '화학' },
  { id: '10', symbol: '068270', name: '셀트리온', market: 'KOSPI', sector: '바이오' },
  { id: '11', symbol: '028260', name: '삼성물산', market: 'KOSPI', sector: '지주' },
  { id: '12', symbol: '105560', name: 'KB금융', market: 'KOSPI', sector: '금융' },
  { id: '13', symbol: '055550', name: '신한지주', market: 'KOSPI', sector: '금융' },
  { id: '14', symbol: '066570', name: 'LG전자', market: 'KOSPI', sector: '가전' },
  { id: '15', symbol: '003550', name: 'LG', market: 'KOSPI', sector: '지주' },
  { id: '16', symbol: '012330', name: '현대모비스', market: 'KOSPI', sector: '자동차부품' },
  { id: '17', symbol: '096770', name: 'SK이노베이션', market: 'KOSPI', sector: '에너지' },
  { id: '18', symbol: '034730', name: 'SK', market: 'KOSPI', sector: '지주' },
  { id: '19', symbol: '003670', name: '포스코홀딩스', market: 'KOSPI', sector: '철강' },
  { id: '20', symbol: '000270', name: '기아', market: 'KOSPI', sector: '자동차' },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: MOCK_SYMBOLS,
    total: MOCK_SYMBOLS.length,
  });
}

