import React from 'react';

const OwnerBadge = ({ ownerNames = [] }) => {
  if (ownerNames.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        Shared
      </span>
    );
  }
  const displayNames = ownerNames.slice(0, 2);
  const extra = ownerNames.length - 2;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
      👤 {displayNames.join(', ')}{extra > 0 ? ` +${extra}` : ''}
    </span>
  );
};

export default OwnerBadge;
