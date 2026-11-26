import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/finance';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-50 flex flex-col gap-2.5 lg:bottom-6 lg:right-6 max-w-sm w-[calc(100vw-2rem)]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'error'
            ? AlertCircle
            : toast.variant === 'info'
              ? Info
              : CheckCircle2;

        const iconColor =
          toast.variant === 'error'
            ? 'text-[#D9536F] bg-[#FDECEF]'
            : toast.variant === 'info'
              ? 'text-[#D98A3C] bg-[#FDF3E8]'
              : 'text-[#3D8B74] bg-[#EAF5F1]';

        return (
          <div
            key={toast.id}
            className="soft-card rounded-2xl p-3.5 flex items-start gap-3 transition-all duration-200"
          >
            <span
              className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${iconColor}`}
              aria-hidden="true"
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-[#2D2226] leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-[#7A656C] mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Dismiss ${toast.title}`}
              className="p-1.5 rounded-lg text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FCE7EC]/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
