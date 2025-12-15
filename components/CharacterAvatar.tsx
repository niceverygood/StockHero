'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CHARACTERS, type CharacterInfo } from '@/lib/characters';
import type { CharacterType } from '@/lib/types';

interface CharacterAvatarProps {
  character: CharacterType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { container: 'w-8 h-8', text: 'text-sm' },
  md: { container: 'w-10 h-10', text: 'text-base' },
  lg: { container: 'w-12 h-12', text: 'text-lg' },
  xl: { container: 'w-16 h-16', text: 'text-xl' },
};

export function CharacterAvatar({ character, size = 'md', className = '' }: CharacterAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const char = CHARACTERS[character];
  const sizeStyles = SIZES[size];

  if (imageError) {
    return (
      <div 
        className={`${sizeStyles.container} rounded-xl bg-gradient-to-br ${char.gradient} flex items-center justify-center text-white font-bold ${sizeStyles.text} shadow-lg ${className}`}
      >
        {char.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className={`relative ${sizeStyles.container} rounded-xl overflow-hidden shadow-lg ${className}`}>
      <Image
        src={char.image}
        alt={char.name}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export function CharacterAvatarGroup({ 
  characters = ['claude', 'gemini', 'gpt'] as CharacterType[],
  size = 'md',
  overlap = true
}: { 
  characters?: CharacterType[];
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
}) {
  return (
    <div className={`flex items-center ${overlap ? '-space-x-2' : 'gap-2'}`}>
      {characters.map((char) => (
        <div key={char} className={overlap ? 'border-2 border-dark-900 rounded-xl' : ''}>
          <CharacterAvatar character={char} size={size} />
        </div>
      ))}
    </div>
  );
}

