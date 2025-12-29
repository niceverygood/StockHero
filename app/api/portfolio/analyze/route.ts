import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

interface ExtractedHolding {
  symbolCode: string;
  symbolName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  profitRate: number;
}

interface ExtractedPortfolio {
  holdings: ExtractedHolding[];
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitRate: number;
  accountInfo?: string;
}

const ANALYSIS_PROMPT = `당신은 증권사 HTS/MTS 스크린샷을 분석하는 전문가입니다.
이미지에서 주식 보유 현황을 추출해주세요.

다음 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력:
{
  "holdings": [
    {
      "symbolCode": "종목코드 (6자리 숫자, 모르면 빈 문자열)",
      "symbolName": "종목명",
      "quantity": 보유수량 (숫자),
      "avgPrice": 평균단가 (숫자, 모르면 0),
      "currentPrice": 현재가 (숫자),
      "totalValue": 평가금액 (숫자),
      "profit": 평가손익 (숫자, 손실이면 음수),
      "profitRate": 수익률 (%, 손실이면 음수)
    }
  ],
  "totalValue": 총평가금액 (숫자),
  "totalInvested": 총매입금액 (숫자, 모르면 0),
  "totalProfit": 총평가손익 (숫자),
  "profitRate": 총수익률 (%),
  "accountInfo": "계좌 정보나 증권사명 (있으면)"
}

주의사항:
1. 이미지에서 보이는 모든 종목을 추출하세요
2. 숫자에서 쉼표(,)를 제거하고 순수 숫자로 변환하세요
3. 수익률이 음수면 손실입니다
4. 확실하지 않은 정보는 0이나 빈 문자열로 처리하세요
5. 종목코드를 모르면 종목명만이라도 정확히 추출하세요`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/png';

    // Call GPT-4o Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse portfolio data from image' },
        { status: 400 }
      );
    }

    const extractedData: ExtractedPortfolio = JSON.parse(jsonMatch[0]);

    // Add weight calculation
    const totalValue = extractedData.totalValue || extractedData.holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const holdingsWithWeight = extractedData.holdings.map(holding => ({
      ...holding,
      weight: totalValue > 0 ? Number(((holding.totalValue / totalValue) * 100).toFixed(2)) : 0,
    }));

    // Fill in missing symbol codes with common stocks
    const KNOWN_STOCKS: Record<string, string> = {
      '삼성전자': '005930',
      'SK하이닉스': '000660',
      'LG에너지솔루션': '373220',
      '삼성바이오로직스': '207940',
      '현대차': '005380',
      '현대자동차': '005380',
      '삼성SDI': '006400',
      '카카오': '035720',
      '네이버': '035420',
      'NAVER': '035420',
      'LG화학': '051910',
      '기아': '000270',
      'KB금융': '105560',
      '신한지주': '055550',
      '셀트리온': '068270',
      '포스코홀딩스': '003670',
      'LG전자': '066570',
      '삼성물산': '028260',
      '현대모비스': '012330',
      'SK이노베이션': '096770',
      'SK': '034730',
      'LG': '003550',
      '삼성화재': '000810',
      '하나금융지주': '086790',
      '우리금융지주': '316140',
    };

    const enrichedHoldings = holdingsWithWeight.map(holding => ({
      ...holding,
      symbolCode: holding.symbolCode || KNOWN_STOCKS[holding.symbolName] || '',
    }));

    return NextResponse.json({
      success: true,
      data: {
        holdings: enrichedHoldings,
        totalValue: totalValue,
        totalInvested: extractedData.totalInvested || 0,
        totalProfit: extractedData.totalProfit || 0,
        profitRate: extractedData.profitRate || 0,
        accountInfo: extractedData.accountInfo,
      },
    });
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze portfolio image' },
      { status: 500 }
    );
  }
}






