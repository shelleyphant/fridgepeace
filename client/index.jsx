import { createRoot } from 'react-dom/client';
import './main.css';
import { useState, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FilterBar from './components/inventory/FilterBar';
import SortSelector from './components/inventory/SortSelector';
import InventoryList from './components/inventory/InventoryList';
import FloatingAddButton from './components/inventory/FloatingAddButton';
import { useFridgeState } from './hooks/useFridgeState';
import { API_URL, STORAGE_KEYS } from './constants';

const isSetUp = () =>
  localStorage.getItem(STORAGE_KEYS.MEMBER_ID) &&
  localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID) &&
  localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID);

const FridgeApp = ({ onLeaveHousehold }) => {
  const { state, dispatch, refresh } = useFridgeState();

  const currentMemberId = parseInt(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID));

  useEffect(() => {
    if (state.error && state.error.response?.status === 404) {
      onLeaveHousehold();
    }
  }, [state.error, onLeaveHousehold]);

  const filtered = useMemo(() => {
    let result = [...state.items];
    if (state.filterBy === 'mine') {
      result = result.filter((i) => (i.owner_ids ?? []).includes(currentMemberId));
    } else if (state.filterBy !== 'all') {
      result = result.filter((i) => i.storage_location === state.filterBy);
    }
    result.sort((a, b) => {
      if (state.sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      if (state.sortBy === 'expiry') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      }
      return new Date(b.date_added) - new Date(a.date_added);
    });
    return result;
  }, [state.items, state.sortBy, state.filterBy, currentMemberId]);

  const handleDelete = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleEditSave = useCallback(() => {
    dispatch({ type: 'CLEAR_EDIT' });
    refresh();
  }, [dispatch, refresh]);

  const handleDrawerSuccess = useCallback(() => {
    dispatch({ type: 'CLOSE_DRAWER' });
    refresh();
  }, [dispatch, refresh]);

  const handleLogout = () => {
    if (!window.confirm('Logout and clear local data?')) return;
    localStorage.clear();
    onLeaveHousehold();
  };

  const handleSwitchHousehold = async (newHouseholdId) => {
    localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_ID, newHouseholdId);
    try {
      const memberId = localStorage.getItem(STORAGE_KEYS.MEMBER_ID);
      const { data: members } = await axios.get(`${API_URL}/member/${newHouseholdId}/members`);
      const myMembership = members.find((m) => String(m.user_id) === memberId);
      if (myMembership) {
        localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID, String(myMembership.id));
      }
    } catch (e) {
      console.error('Failed to switch household', e);
    }
    refresh();
  };

  const householdId = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID);
  const memberName = localStorage.getItem(STORAGE_KEYS.MEMBER_NAME);
  const userId = localStorage.getItem(STORAGE_KEYS.MEMBER_ID);

  return (
    <>
      <div className="m-auto max-w-lg p-4 pb-20 min-h-screen">
        <Header
          householdId={householdId}
          memberName={memberName}
          userId={userId}
          onLogout={handleLogout}
          onLeaveHousehold={onLeaveHousehold}
          onSwitchHousehold={handleSwitchHousehold}
        />

        <FilterBar
          value={state.filterBy}
          onChange={(v) => dispatch({ type: 'SET_FILTER', payload: v })}
        />

        <SortSelector
          value={state.sortBy}
          onChange={(v) => dispatch({ type: 'SET_SORT', payload: v })}
        />

        <InventoryList
          items={filtered}
          loading={state.loading}
          error={state.error}
          editingItem={state.editingItem}
          onRetry={() => refresh()}
          onDelete={handleDelete}
          onEdit={(it) => dispatch({ type: 'EDIT_ITEM', payload: it })}
          onEditSave={handleEditSave}
          onEditCancel={() => dispatch({ type: 'CLEAR_EDIT' })}
        />

        <Drawer
          isOpen={state.isDrawerOpen}
          onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
          onSuccess={handleDrawerSuccess}
        />
      </div>

      <FloatingAddButton onClick={() => dispatch({ type: 'OPEN_DRAWER' })} />
    </>
  );
};

const App = () => {
  const [ready, setReady] = useState(isSetUp);

  const handleLeaveHousehold = () => {
    localStorage.clear();
    setReady(false);
  };

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  return <FridgeApp onLeaveHousehold={handleLeaveHousehold} />;
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
