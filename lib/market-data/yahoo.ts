/**
 * Yahoo Finance API (비공식)
 * 미국주식 실시간 시세 조회용 폴백
 */

// 미국 종목명 매핑
const US_STOCK_NAMES: Record<string, string> = {
  'AAPL': 'Apple',
  'MSFT': 'Microsoft',
  'GOOGL': 'Alphabet (Google)',
  'AMZN': 'Amazon',
  'NVDA': 'NVIDIA',
  'META': 'Meta (Facebook)',
  'TSLA': 'Tesla',
  'TSM': 'TSMC',
  'AVGO': 'Broadcom',
  'AMD': 'AMD',
  'NFLX': 'Netflix',
  'INTC': 'Intel',
  'QCOM': 'Qualcomm',
  'COST': 'Costco',
  'PEP': 'PepsiCo',
  'ADBE': 'Adobe',
  'CSCO': 'Cisco',
  'CRM': 'Salesforce',
  'ORCL': 'Oracle',
  'IBM': 'IBM',
  'JPM': 'JPMorgan Chase',
  'V': 'Visa',
  'MA': 'Mastercard',
  'BAC': 'Bank of America',
  'WMT': 'Walmart',
  'KO': 'Coca-Cola',
  'DIS': 'Disney',
  'NKE': 'Nike',
  'MCD': "McDonald's",
  'BA': 'Boeing',
  'CAT': 'Caterpillar',
  'GS': 'Goldman Sachs',
  'MMM': '3M',
  'JNJ': 'Johnson & Johnson',
  'PFE': 'Pfizer',
  'UNH': 'UnitedHealth',
  'MRK': 'Merck',
  'ABBV': 'AbbVie',
  'LLY': 'Eli Lilly',
  'XOM': 'Exxon Mobil',
  'CVX': 'Chevron',
  'HD': 'Home Depot',
  'LOW': "Lowe's",
  'TGT': 'Target',
  'SBUX': 'Starbucks',
  'COIN': 'Coinbase',
  'PLTR': 'Palantir',
  'SOFI': 'SoFi',
  'RIVN': 'Rivian',
  'LCID': 'Lucid Motors',
};

interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  marketCap: number;
}

/**
 * Yahoo Finance에서 미국주식 시세 조회
 */
export async function fetchYahooUSStockPrice(symbol: string): Promise<YahooQuote> {
  const upperSymbol = symbol.toUpperCase();
  
  try {
    // Yahoo Finance API v8 (비공식)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${upperSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data returned from Yahoo Finance');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0] || {};
    
    // 최신 가격 데이터
    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: upperSymbol,
      name: US_STOCK_NAMES[upperSymbol] || meta.shortName || meta.symbol || upperSymbol,
      price: currentPrice,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: meta.regularMarketVolume || 0,
      high: quote.high?.[quote.high.length - 1] || meta.regularMarketDayHigh || 0,
      low: quote.low?.[quote.low.length - 1] || meta.regularMarketDayLow || 0,
      open: quote.open?.[0] || meta.regularMarketOpen || 0,
      previousClose,
      marketCap: meta.marketCap || 0,
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 여러 미국주식 시세 조회
 */
export async function fetchMultipleYahooUSStocks(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const results = new Map<string, YahooQuote>();
  
  // 병렬로 조회 (5개씩)
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 5) {
    chunks.push(symbols.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    const promises = chunk.map(async (symbol) => {
      try {
        const data = await fetchYahooUSStockPrice(symbol);
        results.set(symbol.toUpperCase(), data);
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}




