'use client';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  price: number;
}

export function PaywallModal({ isOpen, onClose, title, price }: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl max-w-md w-full animate-fade-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-dark-50 mb-2">Complete Purchase</h2>
            <p className="text-sm text-dark-400">{title}</p>
          </div>

          {/* Price */}
          <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Premium Report</span>
              <span className="text-xl font-bold text-dark-100">{price.toLocaleString()}원</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <button className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 rounded-xl flex items-center gap-4 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-400 font-bold">K</span>
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-dark-200 group-hover:text-white transition-colors">카카오페이</div>
                <div className="text-xs text-dark-500">Kakao Pay</div>
              </div>
              <svg className="w-5 h-5 text-dark-600 group-hover:text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 rounded-xl flex items-center gap-4 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-green-400 font-bold">N</span>
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-dark-200 group-hover:text-white transition-colors">네이버페이</div>
                <div className="text-xs text-dark-500">Naver Pay</div>
              </div>
              <svg className="w-5 h-5 text-dark-600 group-hover:text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 rounded-xl flex items-center gap-4 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-dark-200 group-hover:text-white transition-colors">신용카드</div>
                <div className="text-xs text-dark-500">Credit Card</div>
              </div>
              <svg className="w-5 h-5 text-dark-600 group-hover:text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Terms */}
          <p className="text-xs text-dark-500 text-center">
            결제 시 이용약관 및 환불 정책에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
