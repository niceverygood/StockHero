'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ShareButtonsProps {
  url: string;
  title?: string;
  description?: string;
  hashtags?: string[];
}

export default function ShareButtons({ url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex justify-center">
      <motion.button
        onClick={handleCopyLink}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
          copied 
            ? 'bg-brand-500 text-white' 
            : 'bg-dark-700 hover:bg-dark-600 text-dark-100'
        }`}
      >
        <span className="text-lg">{copied ? '✅' : '🔗'}</span>
        <span>{copied ? '링크가 복사되었습니다!' : '링크 복사'}</span>
      </motion.button>
    </div>
  );
}

