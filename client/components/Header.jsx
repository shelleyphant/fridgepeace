import React from 'react';

const Header = ({ householdId, memberName, onLogout }) => {
  const handleCopy = () => {
    if (householdId) {
      navigator.clipboard?.writeText(householdId);
    }
  };

  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold">FridgePeace</h1>
        {householdId && (
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 truncate"
            onClick={handleCopy}
            title="Copy household code"
          >
            <span className="truncate">🏠 {householdId}</span>
            <span className="shrink-0 text-water-600">copy</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {memberName && (
          <span className="text-xs text-gray-600 truncate max-w-20">{memberName}</span>
        )}
        <button
          className="rounded-full bg-gray-100 px-3 py-1 text-center text-xs text-gray-600 hover:bg-gray-200"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
