interface AdSlotProps {
  variant?: 'banner' | 'sidebar' | 'inline';
}

export function AdSlot({ variant = 'inline' }: AdSlotProps) {
  const sizes = {
    banner: 'h-20',
    sidebar: 'h-60',
    inline: 'h-24',
  };

  return (
    <div 
      className={`
        ${sizes[variant]} 
        rounded-xl 
        border border-dashed border-dark-700 
        bg-dark-900/30 
        flex items-center justify-center
        text-xs text-dark-600
        transition-all hover:border-dark-600
      `}
    >
      <div className="text-center">
        <div className="mb-1">Advertisement</div>
        <div className="text-2xs text-dark-700">Ad Slot Available</div>
      </div>
    </div>
  );
}
