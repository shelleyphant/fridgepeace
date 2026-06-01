import React from 'react';

const OwnerBadge = ({ ownerName }) => {
  if (!ownerName) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
        Shared
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
      👤 {ownerName}
    </span>
  );
};

export default OwnerBadge;
