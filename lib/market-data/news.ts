/**
 * 실시간 뉴스/최신 이슈 가져오기
 * 네이버 금융 API 기반
 */

export interface StockNews {
  title: string;
  summary: string;
  source: string;
  date: string;
  url?: string;
}

// 네이버 금융 API에서 종목별 뉴스 가져오기
export async function fetchStockNews(symbol: string, limit: number = 5): Promise<StockNews[]> {
  try {
    const url = `https://m.stock.naver.com/api/news/stock/${symbol}?pageSize=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const news: StockNews[] = [];
    
    if (data.news && Array.isArray(data.news)) {
      for (const item of data.news.slice(0, limit)) {
        news.push({
          title: item.title || '',
          summary: item.body || item.title || '',
          source: item.officeName || '',
          date: item.datetime || '',
          url: item.articleId ? `https://n.news.naver.com/article/${item.oid}/${item.articleId}` : undefined,
        });
      }
    }
    
    return news;
  } catch (error) {
    console.error('Failed to fetch stock news:', error);
    return [];
  }
}

// 네이버 금융에서 실시간 주요 뉴스 가져오기
export async function fetchMarketNews(limit: number = 10): Promise<StockNews[]> {
  try {
    const url = `https://m.stock.naver.com/api/news/market?pageSize=${limit}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const news: StockNews[] = [];
    
    if (data.news && Array.isArray(data.news)) {
      for (const item of data.news.slice(0, limit)) {
        news.push({
          title: item.title || '',
          summary: item.body || item.title || '',
          source: item.officeName || '',
          date: item.datetime || '',
        });
      }
    }
    
    return news;
  } catch (error) {
    console.error('Failed to fetch market news:', error);
    return [];
  }
}

// 특정 키워드로 뉴스 검색 (네이버 검색 API 활용)
export async function searchStockNews(keyword: string, limit: number = 5): Promise<StockNews[]> {
  try {
    // 네이버 금융 종목 검색 후 해당 종목의 뉴스 가져오기
    const searchUrl = `https://m.stock.naver.com/api/stocks/search?keyword=${encodeURIComponent(keyword)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!searchRes.ok) {
      // 검색 실패 시 시장 뉴스에서 키워드 관련 뉴스 반환
      const marketNews = await fetchMarketNews(20);
      return marketNews.filter(n => 
        n.title.includes(keyword) || n.summary.includes(keyword)
      ).slice(0, limit);
    }
    
    const searchData = await searchRes.json();
    
    // 검색 결과에서 첫 번째 종목의 심볼 찾기
    const firstStock = searchData.stocks?.[0];
    if (firstStock?.stockCode) {
      return await fetchStockNews(firstStock.stockCode, limit);
    }
    
    // 종목을 못 찾은 경우 시장 뉴스에서 필터링
    const marketNews = await fetchMarketNews(20);
    return marketNews.filter(n => 
      n.title.includes(keyword) || n.summary.includes(keyword)
    ).slice(0, limit);
  } catch (error) {
    console.error('Failed to search stock news:', error);
    return [];
  }
}

// AI 상담용 최신 시장 컨텍스트 생성
export async function getMarketContext(stockName?: string): Promise<string> {
  try {
    let context = '';
    
    // 1. 전체 시장 뉴스
    const marketNews = await fetchMarketNews(3);
    if (marketNews.length > 0) {
      context += '## 오늘의 시장 주요 뉴스\n';
      marketNews.forEach(news => {
        context += `- ${news.title} (${news.source})\n`;
      });
      context += '\n';
    }
    
    // 2. 특정 종목 뉴스 (요청 시)
    if (stockName) {
      const stockNews = await searchStockNews(stockName, 3);
      if (stockNews.length > 0) {
        context += `## ${stockName} 관련 최신 뉴스\n`;
        stockNews.forEach(news => {
          context += `- ${news.title}\n`;
          if (news.summary && news.summary !== news.title) {
            context += `  ${news.summary.slice(0, 100)}...\n`;
          }
        });
        context += '\n';
      }
    }
    
    return context;
  } catch (error) {
    console.error('Failed to get market context:', error);
    return '';
  }
}
