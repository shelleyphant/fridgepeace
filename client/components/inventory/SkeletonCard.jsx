import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm mt-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-gray-200"></div>
          <div className="h-3 w-20 rounded bg-gray-200"></div>
        </div>
        <div className="h-6 w-16 rounded-full bg-gray-200"></div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-24 rounded bg-gray-200"></div>
        <div className="h-3 w-20 rounded bg-gray-200"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
