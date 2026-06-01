import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

const Header = ({ householdId, memberName, userId, onLogout, onLeaveHousehold, onSwitchHousehold }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [members, setMembers] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [loadingPanel, setLoadingPanel] = useState(false);

  const handleCopy = () => {
    if (householdId) {
      navigator.clipboard?.writeText(householdId);
    }
  };

  const openPanel = async () => {
    setShowPanel(true);
    setLoadingPanel(true);
    setConfirmLeave(false);
    try {
      const [membersRes, householdsRes] = await Promise.all([
        axios.get(`${API}/member/${householdId}/members`),
        userId ? axios.get(`${API}/member/${userId}/households`) : Promise.resolve({ data: [] }),
      ]);
      setMembers(membersRes.data);
      setHouseholds(householdsRes.data);
    } catch (e) {
      console.error('Failed to load household data', e);
    } finally {
      setLoadingPanel(false);
    }
  };

  const handleLeave = async () => {
    try {
      await axios.post(`${API}/member/leave/`, {
        user_id: parseInt(userId),
        household_id: householdId,
      });
      setShowPanel(false);
      onLeaveHousehold();
    } catch (e) {
      console.error('Failed to leave household', e);
    }
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">FridgePeace</h1>
          {householdId && (
            <button
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 truncate"
              onClick={openPanel}
              title="Household settings"
            >
              <span className="truncate">🏠 {householdId}</span>
              <span className="shrink-0 text-water-600">manage</span>
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

      {showPanel && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Household</h2>
              <button className="text-xl text-gray-400" onClick={() => setShowPanel(false)}>✕</button>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500">Household Code</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-gray-100 px-3 py-1.5 font-mono text-sm font-bold tracking-wider">{householdId}</span>
                <button className="text-xs text-water-600 hover:text-water-700" onClick={handleCopy}>Copy</button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500">Members</label>
              {loadingPanel ? (
                <p className="mt-1 text-sm text-gray-400">Loading...</p>
              ) : members.length === 0 ? (
                <p className="mt-1 text-sm text-gray-400">No members found</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="h-2 w-2 rounded-full bg-green-400" />
                      {m.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {households.length > 1 && (
              <div className="mb-3">
                <label className="text-xs text-gray-500">Switch Household</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500"
                  value={householdId}
                  onChange={(e) => { onSwitchHousehold(e.target.value); setShowPanel(false); }}
                >
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>{h.name || h.id}</option>
                  ))}
                </select>
              </div>
            )}

            {!confirmLeave ? (
              <button
                className="mt-2 w-full rounded-full border border-red-300 px-4 py-2 text-center text-sm text-red-600 hover:bg-red-50"
                onClick={() => setConfirmLeave(true)}
              >
                Leave Household
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-center text-sm text-red-600">Leave this household?</p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-full bg-red-500 px-4 py-2 text-center text-sm text-white hover:bg-red-600"
                    onClick={handleLeave}
                  >
                    Confirm Leave
                  </button>
                  <button
                    className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-center text-sm text-gray-600 hover:bg-gray-200"
                    onClick={() => setConfirmLeave(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
