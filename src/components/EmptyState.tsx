import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="soft-card rounded-2xl px-6 py-12 flex flex-col items-center text-center">
      <svg
        width="104"
        height="84"
        viewBox="0 0 104 84"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4"
        aria-hidden="true"
      >
        <rect x="14" y="14" width="76" height="54" rx="14" fill="#FCE7EC" fillOpacity="0.65" />
        <rect
          x="22"
          y="22"
          width="60"
          height="38"
          rx="9"
          fill="#FFFFFF"
          stroke="#F9E4EA"
          strokeWidth="1.5"
        />
        <line x1="32" y1="35" x2="58" y2="35" stroke="#E87A90" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="44" x2="70" y2="44" stroke="#F3D1DA" strokeWidth="2" strokeLinecap="round" />
        <line x1="32" y1="51" x2="50" y2="51" stroke="#F3D1DA" strokeWidth="2" strokeLinecap="round" />
        <circle cx="72" cy="24" r="9" fill="#E87A90" />
        <path d="M68.5 24H75.5M72 20.5V27.5" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <h3 className="text-base font-semibold text-[#2D2226]">{title}</h3>
      <p className="text-sm text-[#7A656C] mt-1.5 max-w-md leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
