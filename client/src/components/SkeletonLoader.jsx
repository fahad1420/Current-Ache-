import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
    <div className="h-6 bg-slate-200 rounded-lg w-1/2"></div>
    <div className="h-14 bg-slate-100 rounded-2xl"></div>
    <div className="h-20 bg-slate-100 rounded-2xl"></div>
  </div>
);

export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-16 bg-slate-100 border border-slate-200/60 rounded-2xl"></div>
    ))}
  </div>
);
