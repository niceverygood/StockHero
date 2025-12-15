import { PrismaClient } from '@prisma/client';
import { addDays, format, subDays } from 'date-fns';

const prisma = new PrismaClient();

const MOCK_SYMBOLS = [
  { symbol: '005930', name: '삼성전자', market: 'KOSPI', sector: '반도체' },
  { symbol: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '반도체' },
  { symbol: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '2차전지' },
  { symbol: '207940', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { symbol: '005380', name: '현대차', market: 'KOSPI', sector: '자동차' },
  { symbol: '006400', name: '삼성SDI', market: 'KOSPI', sector: '2차전지' },
  { symbol: '035720', name: '카카오', market: 'KOSPI', sector: 'IT서비스' },
  { symbol: '035420', name: 'NAVER', market: 'KOSPI', sector: 'IT서비스' },
  { symbol: '051910', name: 'LG화학', market: 'KOSPI', sector: '화학' },
  { symbol: '068270', name: '셀트리온', market: 'KOSPI', sector: '바이오' },
  { symbol: '028260', name: '삼성물산', market: 'KOSPI', sector: '지주' },
  { symbol: '105560', name: 'KB금융', market: 'KOSPI', sector: '금융' },
  { symbol: '055550', name: '신한지주', market: 'KOSPI', sector: '금융' },
  { symbol: '066570', name: 'LG전자', market: 'KOSPI', sector: '가전' },
  { symbol: '003550', name: 'LG', market: 'KOSPI', sector: '지주' },
  { symbol: '012330', name: '현대모비스', market: 'KOSPI', sector: '자동차부품' },
  { symbol: '096770', name: 'SK이노베이션', market: 'KOSPI', sector: '에너지' },
  { symbol: '034730', name: 'SK', market: 'KOSPI', sector: '지주' },
  { symbol: '003670', name: '포스코홀딩스', market: 'KOSPI', sector: '철강' },
  { symbol: '000270', name: '기아', market: 'KOSPI', sector: '자동차' },
  { symbol: '086790', name: '하나금융지주', market: 'KOSPI', sector: '금융' },
  { symbol: '032830', name: '삼성생명', market: 'KOSPI', sector: '보험' },
  { symbol: '015760', name: '한국전력', market: 'KOSPI', sector: '전력' },
  { symbol: '009150', name: '삼성전기', market: 'KOSPI', sector: '전자부품' },
  { symbol: '033780', name: 'KT&G', market: 'KOSPI', sector: '담배' },
  { symbol: '010130', name: '고려아연', market: 'KOSPI', sector: '비철금속' },
  { symbol: '018260', name: '삼성에스디에스', market: 'KOSPI', sector: 'IT서비스' },
  { symbol: '024110', name: '기업은행', market: 'KOSPI', sector: '금융' },
  { symbol: '030200', name: 'KT', market: 'KOSPI', sector: '통신' },
  { symbol: '017670', name: 'SK텔레콤', market: 'KOSPI', sector: '통신' },
];

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.outcome.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.verdict.deleteMany();
  await prisma.debateMessage.deleteMany();
  await prisma.debateSession.deleteMany();
  await prisma.premiumReport.deleteMany();
  await prisma.symbol.deleteMany();

  // Create symbols
  const symbols = await Promise.all(
    MOCK_SYMBOLS.map((s) =>
      prisma.symbol.create({
        data: {
          symbol: s.symbol,
          name: s.name,
          market: s.market,
          sector: s.sector,
        },
      })
    )
  );
  console.log(`Created ${symbols.length} symbols`);

  // Create verdicts and predictions for the past 30 days
  const today = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const random = seededRandom(i * 1000);
    
    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Select random 5 symbols for top5
    const shuffled = [...symbols].sort(() => random() - 0.5);
    const top5Symbols = shuffled.slice(0, 5);

    const top5Data = top5Symbols.map((s, idx) => ({
      rank: idx + 1,
      symbolId: s.id,
      symbol: s.symbol,
      name: s.name,
      avgScore: 4.2 + random() * 0.7,
      rationale: getRandomRationale(s.sector || '기타', random),
    }));

    // Create verdict
    await prisma.verdict.create({
      data: {
        date: dateStr,
        top5: top5Data,
        rationale: `${dateStr} 종합 분석: 실적 개선 기대감과 업종 모멘텀을 고려한 선정. 다만, 시장 변동성에 주의가 필요합니다.`,
      },
    });

    // Create predictions for top5
    for (const item of top5Data) {
      const direction = random() > 0.3 ? 'up' : random() > 0.5 ? 'neutral' : 'down';
      const confidence = 0.55 + random() * 0.35;

      const prediction = await prisma.prediction.create({
        data: {
          date: dateStr,
          symbolId: item.symbolId,
          horizonDays: 5,
          predictedDirection: direction,
          confidence,
        },
      });

      // Create outcome for past predictions (older than 5 days)
      if (i > 5) {
        const realizedReturn = (random() - 0.4) * 10; // -4% to +6%
        const isHit =
          (direction === 'up' && realizedReturn > 0) ||
          (direction === 'down' && realizedReturn < 0) ||
          (direction === 'neutral' && Math.abs(realizedReturn) < 1);

        await prisma.outcome.create({
          data: {
            predictionId: prediction.id,
            realizedReturn,
            isHit,
          },
        });
      }
    }
  }

  console.log('Created verdicts and predictions for 30 days');

  // Create sample debate sessions
  const sampleSymbols = symbols.slice(0, 3);
  const todayStr = format(today, 'yyyy-MM-dd');

  for (const symbol of sampleSymbols) {
    const session = await prisma.debateSession.create({
      data: {
        symbolId: symbol.id,
        date: todayStr,
        status: 'done',
        messages: {
          create: [
            {
              role: 'SYSTEM',
              content: `${symbol.name}(${symbol.symbol})에 대한 토론을 시작합니다. 각 분석가는 자신의 관점에서 종목을 분석해 주세요.`,
              sources: JSON.stringify([]),
            },
            {
              role: 'CLAUDE',
              content: `${symbol.name}의 최근 분기 실적을 보면, 매출과 영업이익 모두 전년 동기 대비 성장세를 유지하고 있습니다. 특히 ${symbol.sector} 업종 내에서 시장 점유율이 안정적입니다. 재무 건전성 측면에서 부채비율이 양호하고, 현금 흐름도 긍정적입니다. 다만, 원자재 가격 변동에 따른 마진 압박 가능성은 모니터링이 필요합니다.`,
              sources: JSON.stringify(['분기보고서', '산업분석리포트']),
              score: 4,
              risks: '원자재 가격 변동, 환율 리스크',
            },
            {
              role: 'GEMINI',
              content: `트렌드 관점에서 ${symbol.name}을 보면, 신사업 확장 전략이 긍정적입니다. ${symbol.sector} 분야에서의 기술 혁신이 새로운 성장 동력이 될 수 있습니다. 글로벌 시장에서의 경쟁력도 개선되고 있어, 중장기적 관점에서 관심을 가져볼 만합니다. 다만, 단기적으로는 투자 비용 증가로 인한 수익성 압박이 있을 수 있습니다.`,
              sources: JSON.stringify(['기술동향보고서', '시장분석']),
              score: 4,
              risks: '신사업 투자 비용, 경쟁 심화',
            },
            {
              role: 'GPT',
              content: `거시경제 관점에서 정리하면, 현재 금리 환경과 글로벌 경기 흐름을 고려할 때 ${symbol.sector} 업종 전반에 대한 시장 심리는 조심스럽습니다. ${symbol.name}은 동종 업계 내에서 상대적으로 안정적인 포지션을 가지고 있으나, 대외 불확실성에 대한 대비가 필요합니다. 종합하면, 펀더멘털은 양호하나 매크로 리스크를 함께 고려해야 합니다.`,
              sources: JSON.stringify(['매크로리포트', '업종분석']),
              score: 4,
              risks: '금리 변동, 글로벌 경기 둔화',
            },
          ],
        },
      },
    });
    console.log(`Created debate session for ${symbol.name}`);
  }

  // Create premium reports
  for (let i = 7; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    await prisma.premiumReport.create({
      data: {
        date: dateStr,
        title: `${dateStr} 프리미엄 시장 분석 리포트`,
        summaryFree: '오늘의 시장은 외국인 매수세와 함께 상승 마감했습니다. 반도체 업종이 강세를 보였으며, 바이오 섹터는 차익 실현 매물로 약세를 기록했습니다.',
        contentPaid: '상세 분석: 외국인 순매수 상위 종목 분석, 섹터별 자금 흐름, 이번 주 주목할 이벤트 일정, 기관 수급 동향, 프로그램 매매 분석 등이 포함되어 있습니다.',
        isLocked: true,
      },
    });
  }

  console.log('Created premium reports');
  console.log('Seeding completed!');
}

function getRandomRationale(sector: string, random: () => number): string {
  const rationales = [
    `${sector} 업종 내 시장 점유율 확대 기대`,
    `실적 턴어라운드 가능성 주목`,
    `글로벌 수요 회복에 따른 수혜 예상`,
    `신규 사업 모멘텀 긍정적`,
    `밸류에이션 매력도 부각`,
    `수급 개선 흐름 지속`,
  ];
  return rationales[Math.floor(random() * rationales.length)];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

