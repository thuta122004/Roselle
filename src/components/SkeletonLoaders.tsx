import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading workspace">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="soft-card rounded-2xl p-5 space-y-3">
            <div className="h-3.5 w-24 rounded bg-[#FCE7EC]" />
            <div className="h-7 w-36 rounded bg-[#FCE7EC]/80" />
            <div className="h-3 w-28 rounded bg-[#FCE7EC]/60" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="soft-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FCE7EC]" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-28 rounded bg-[#FCE7EC]" />
                <div className="h-3 w-20 rounded bg-[#FCE7EC]/70" />
              </div>
            </div>
            <div className="h-6 w-24 rounded bg-[#FCE7EC]/80" />
          </div>
        ))}
      </div>
      <div className="soft-card rounded-2xl p-5 space-y-4">
        <div className="h-4 w-40 rounded bg-[#FCE7EC]" />
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FCE7EC]" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-44 rounded bg-[#FCE7EC]" />
                <div className="h-3 w-32 rounded bg-[#FCE7EC]/70" />
              </div>
            </div>
            <div className="h-4 w-20 rounded bg-[#FCE7EC]" />
          </div>
        ))}
      </div>
    </div>
  );
};
