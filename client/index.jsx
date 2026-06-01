import { createRoot } from 'react-dom/client';
import './main.css';
import { useState, useMemo } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FoodCard from './components/inventory/FoodCard';
import FoodEditForm from './components/inventory/FoodEditForm';
import SkeletonCard from './components/inventory/SkeletonCard';
import { useInventory } from './hooks/useInventory';
import { API_URL, STORAGE_KEYS } from './constants';

const isSetUp = () =>
  localStorage.getItem(STORAGE_KEYS.MEMBER_ID) &&
  localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID) &&
  localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID);

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'expiry', label: 'Expiring Soon' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'fridge', label: '🧊 Fridge' },
  { value: 'freezer', label: '❄️ Freezer' },
  { value: 'pantry', label: '📦 Pantry' },
];

const App = () => {
  const [ready, setReady] = useState(isSetUp);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [localItems, setLocalItems] = useState(null);
  const { inventory, loading, error, refresh } = useInventory();

  const items = localItems ?? inventory;

  const filtered = useMemo(() => {
    let result = [...items];
    if (filterBy !== 'all') {
      result = result.filter((i) => i.storage_location === filterBy);
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      if (sortBy === 'expiry') {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      }
      return new Date(b.date_added) - new Date(a.date_added);
    });
    return result;
  }, [items, sortBy, filterBy]);

  const handleDelete = (deletedId) => {
    setLocalItems((prev) => (prev ?? inventory).filter((i) => i.id !== deletedId));
  };

  const handleEditSave = () => {
    setEditingItem(null);
    setLocalItems(null);
    refresh();
  };

  const handleLogout = () => {
    if (!window.confirm('Logout and clear local data?')) return;
    localStorage.clear();
    setReady(false);
  };

  const handleLeaveHousehold = () => {
    localStorage.removeItem(STORAGE_KEYS.HOUSEHOLD_ID);
    localStorage.removeItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID);
    setReady(false);
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

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

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
          onLeaveHousehold={handleLeaveHousehold}
          onSwitchHousehold={handleSwitchHousehold}
        />

        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                className={`rounded-full px-3 py-1 text-center text-sm border ${
                  filterBy === o.value
                    ? 'bg-water-600 text-white border-water-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setFilterBy(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex justify-end">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 p-4 text-center">
            <p className="text-red-600">Could not load inventory.</p>
            <button
              className="mt-2 rounded-full bg-red-500 px-4 py-1.5 text-center text-sm text-white hover:bg-red-600"
              onClick={() => refresh()}
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          <div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-8 text-center text-gray-400">
            <p className="text-lg">Your fridge is empty!</p>
            <p className="mt-1 text-sm">Tap + to add your first item.</p>
          </div>
        )}

        {!loading && !error && editingItem && (
          <FoodEditForm
            item={editingItem}
            onSave={handleEditSave}
            onCancel={() => setEditingItem(null)}
          />
        )}

        {!loading && !error && filtered.map((item) =>
          editingItem?.id === item.id ? null : (
            <FoodCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onEdit={(it) => setEditingItem(it)}
            />
          )
        )}

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={() => { setLocalItems(null); refresh(); setIsOpen(false); }} />
      </div>

      <button
        className="fixed bottom-6 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-water-600 text-2xl text-white shadow-lg hover:bg-water-700 active:scale-95"
        onClick={() => setIsOpen(true)}
      >
        +
      </button>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
