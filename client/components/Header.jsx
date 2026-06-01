import React from 'react';

const Header = ({ householdId, memberName, onLogout }) => {
  const handleCopy = () => {
    if (householdId) {
      navigator.clipboard?.writeText(householdId);
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">FridgePeace</h1>
        {householdId && (
          <button
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            onClick={handleCopy}
            title="Copy household code"
          >
            <span>🏠 {householdId}</span>
            <span className="text-xs text-blue-500">copy</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {memberName && (
          <span className="text-sm text-gray-600">{memberName}</span>
        )}
        <button
          className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
