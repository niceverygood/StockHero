'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Holding {
  id?: string;
  symbolCode: string;
  symbolName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  profitRate: number;
  weight: number;
}

interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitRate: number;
  analyzedAt: string;
  holdings: Holding[];
}

// 포트폴리오 업로더 컴포넌트
export function PortfolioUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzedData, setAnalyzedData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
    setAnalyzedData(null);

    // Analyze image
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setAnalyzedData({
          id: '',
          name: '내 포트폴리오',
          ...data.data,
          analyzedAt: new Date().toISOString(),
        });
      } else {
        setError(data.error || '포트폴리오 분석에 실패했습니다.');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('포트폴리오 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analyzedData) return;

    setIsUploading(true);
    try {
      const res = await fetch('/api/portfolio/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: analyzedData.name,
          holdings: analyzedData.holdings,
          totalValue: analyzedData.totalValue,
          totalInvested: analyzedData.totalInvested,
          totalProfit: analyzedData.totalProfit,
          profitRate: analyzedData.profitRate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onUploadComplete();
        setPreviewUrl(null);
        setAnalyzedData(null);
      } else {
        setError(data.error || '포트폴리오 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('포트폴리오 저장 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    setAnalyzedData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!previewUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-dark-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg className="w-12 h-12 mx-auto text-dark-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-dark-200 mb-2">HTS/MTS 스크린샷 업로드</h3>
          <p className="text-sm text-dark-500 mb-4">
            증권사 앱이나 HTS의 보유종목 화면을 캡쳐해서 올려주세요
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-dark-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              키움증권
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              삼성증권
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              미래에셋
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              등 모든 증권사
            </span>
          </div>
        </div>
      )}

      {/* Preview & Analysis */}
      {previewUrl && (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden bg-dark-800">
            <img
              src={previewUrl}
              alt="Portfolio screenshot"
              className="w-full max-h-64 object-contain"
            />
            <button
              onClick={handleCancel}
              className="absolute top-2 right-2 p-2 rounded-full bg-dark-900/80 text-dark-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {isAnalyzing && (
            <div className="p-6 rounded-xl bg-dark-800/50 text-center">
              <svg className="w-8 h-8 mx-auto animate-spin text-brand-500 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-dark-300">AI가 포트폴리오를 분석하고 있습니다...</p>
              <p className="text-sm text-dark-500 mt-1">종목명, 수량, 평가금액 등을 추출 중</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Analyzed Results */}
          {analyzedData && !isAnalyzing && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-dark-800/50">
                  <div className="text-xs text-dark-500 mb-1">총 평가금액</div>
                  <div className="text-lg font-bold text-dark-100">
                    {analyzedData.totalValue.toLocaleString()}원
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-dark-800/50">
                  <div className="text-xs text-dark-500 mb-1">총 매입금액</div>
                  <div className="text-lg font-bold text-dark-100">
                    {analyzedData.totalInvested.toLocaleString()}원
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-dark-800/50">
                  <div className="text-xs text-dark-500 mb-1">평가손익</div>
                  <div className={`text-lg font-bold ${analyzedData.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {analyzedData.totalProfit >= 0 ? '+' : ''}{analyzedData.totalProfit.toLocaleString()}원
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-dark-800/50">
                  <div className="text-xs text-dark-500 mb-1">수익률</div>
                  <div className={`text-lg font-bold ${analyzedData.profitRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {analyzedData.profitRate >= 0 ? '+' : ''}{analyzedData.profitRate.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Holdings */}
              <div className="rounded-xl bg-dark-800/50 overflow-hidden">
                <div className="p-3 border-b border-dark-700/50">
                  <h4 className="font-semibold text-dark-200">추출된 보유종목 ({analyzedData.holdings.length}개)</h4>
                </div>
                <div className="divide-y divide-dark-700/50">
                  {analyzedData.holdings.map((holding, i) => (
                    <div key={i} className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-sm font-bold text-dark-300">
                        {holding.weight.toFixed(0)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-dark-200">{holding.symbolName}</span>
                          {holding.symbolCode && (
                            <span className="text-xs text-dark-500">{holding.symbolCode}</span>
                          )}
                        </div>
                        <div className="text-xs text-dark-500">
                          {holding.quantity}주 × {holding.currentPrice.toLocaleString()}원
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-dark-200">
                          {holding.totalValue.toLocaleString()}원
                        </div>
                        <div className={`text-xs ${holding.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {holding.profit >= 0 ? '+' : ''}{holding.profitRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl bg-dark-800 text-dark-300 hover:bg-dark-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
                >
                  {isUploading ? '저장 중...' : '포트폴리오 저장'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 내 포트폴리오 뷰어 컴포넌트
export function MyPortfolioViewer() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio/my');
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.data);
      }
    } catch (error) {
      console.error('Fetch portfolio error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleDelete = async () => {
    if (!portfolio || !confirm('포트폴리오를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/portfolio/my?id=${portfolio.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  if (!user) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 mx-auto text-dark-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-lg font-semibold text-dark-300 mb-2">로그인이 필요합니다</h3>
        <p className="text-dark-500 text-sm">포트폴리오를 등록하려면 로그인해주세요.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card text-center py-12">
        <svg className="w-8 h-8 mx-auto animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-dark-500 mt-3">포트폴리오를 불러오는 중...</p>
      </div>
    );
  }

  // 업로더 모드
  if (showUploader) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-100">포트폴리오 등록</h3>
          <button
            onClick={() => setShowUploader(false)}
            className="text-sm text-dark-400 hover:text-dark-200 transition-colors"
          >
            취소
          </button>
        </div>
        <PortfolioUploader onUploadComplete={() => {
          setShowUploader(false);
          fetchPortfolio();
        }} />
      </div>
    );
  }

  // 포트폴리오가 없는 경우
  if (!portfolio) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 mx-auto text-dark-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-dark-300 mb-2">등록된 포트폴리오가 없습니다</h3>
        <p className="text-dark-500 text-sm mb-6">HTS/MTS 스크린샷을 업로드하여 포트폴리오를 등록하세요.</p>
        <button
          onClick={() => setShowUploader(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          포트폴리오 등록하기
        </button>
      </div>
    );
  }

  // 포트폴리오 뷰
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-dark-100">{portfolio.name}</h3>
          <p className="text-sm text-dark-500">
            마지막 업데이트: {new Date(portfolio.analyzedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploader(true)}
            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-500 transition-colors"
          >
            업데이트
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 rounded-lg bg-dark-800 text-dark-400 text-sm hover:bg-dark-700 hover:text-dark-200 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-dark-500 mb-1">총 평가금액</div>
          <div className="text-2xl font-bold text-dark-100">
            {(portfolio.totalValue / 10000).toFixed(0)}
            <span className="text-sm text-dark-400 ml-1">만원</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-dark-500 mb-1">총 매입금액</div>
          <div className="text-2xl font-bold text-dark-100">
            {(portfolio.totalInvested / 10000).toFixed(0)}
            <span className="text-sm text-dark-400 ml-1">만원</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-dark-500 mb-1">평가손익</div>
          <div className={`text-2xl font-bold ${portfolio.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {portfolio.totalProfit >= 0 ? '+' : ''}{(portfolio.totalProfit / 10000).toFixed(0)}
            <span className="text-sm ml-1">만원</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-dark-500 mb-1">수익률</div>
          <div className={`text-2xl font-bold ${portfolio.profitRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {portfolio.profitRate >= 0 ? '+' : ''}{portfolio.profitRate.toFixed(2)}
            <span className="text-sm ml-1">%</span>
          </div>
        </div>
      </div>

      {/* Allocation Chart */}
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-dark-300 mb-3">포트폴리오 구성</h4>
        <div className="h-4 rounded-full overflow-hidden flex bg-dark-800">
          {portfolio.holdings.map((holding, i) => (
            <div
              key={i}
              className={`h-full transition-all ${
                i === 0 ? 'bg-brand-500' :
                i === 1 ? 'bg-emerald-500' :
                i === 2 ? 'bg-amber-500' :
                i === 3 ? 'bg-rose-500' :
                i === 4 ? 'bg-violet-500' :
                i === 5 ? 'bg-cyan-500' :
                'bg-dark-500'
              }`}
              style={{ width: `${holding.weight}%` }}
              title={`${holding.symbolName}: ${holding.weight}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {portfolio.holdings.slice(0, 6).map((holding, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className={`w-2.5 h-2.5 rounded-full ${
                i === 0 ? 'bg-brand-500' :
                i === 1 ? 'bg-emerald-500' :
                i === 2 ? 'bg-amber-500' :
                i === 3 ? 'bg-rose-500' :
                i === 4 ? 'bg-violet-500' :
                i === 5 ? 'bg-cyan-500' :
                'bg-dark-500'
              }`} />
              <span className="text-dark-400">{holding.symbolName}</span>
              <span className="text-dark-500">{holding.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800">
          <h4 className="font-semibold text-dark-200">보유종목 ({portfolio.holdings.length}개)</h4>
        </div>
        <div className="divide-y divide-dark-800">
          {portfolio.holdings.map((holding, i) => (
            <Link
              key={i}
              href={holding.symbolCode ? `/battle/${holding.symbolCode}` : '#'}
              className="p-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                i === 0 ? 'bg-brand-500' :
                i === 1 ? 'bg-emerald-500' :
                i === 2 ? 'bg-amber-500' :
                i === 3 ? 'bg-rose-500' :
                i === 4 ? 'bg-violet-500' :
                'bg-dark-600'
              }`}>
                {holding.weight.toFixed(0)}%
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark-100">{holding.symbolName}</span>
                  {holding.symbolCode && (
                    <span className="text-xs text-dark-500 font-mono">{holding.symbolCode}</span>
                  )}
                </div>
                <div className="text-sm text-dark-500">
                  {holding.quantity}주 × {holding.currentPrice.toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-dark-100">
                  {holding.totalValue.toLocaleString()}원
                </div>
                <div className={`text-sm font-medium ${holding.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {holding.profit >= 0 ? '+' : ''}{holding.profit.toLocaleString()}원
                  <span className="ml-1">({holding.profitRate >= 0 ? '+' : ''}{holding.profitRate.toFixed(2)}%)</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Consultation CTA */}
      <div className="card p-6 bg-gradient-to-r from-brand-600/20 to-violet-600/20 border-brand-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-dark-100">AI 전문가에게 포트폴리오 상담받기</h4>
            <p className="text-sm text-dark-400">등록된 포트폴리오를 기반으로 AI 애널리스트의 분석을 받아보세요</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors"
          >
            상담하기
          </Link>
        </div>
      </div>
    </div>
  );
}








