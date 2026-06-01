import { createRoot } from 'react-dom/client';
import './main.css';
import { useState, useMemo } from 'react';
import Header from './components/Header';
import Button from './components/Button';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FoodCard from './components/inventory/FoodCard';
import FoodEditForm from './components/inventory/FoodEditForm';
import SkeletonCard from './components/inventory/SkeletonCard';
import { useInventory } from './hooks/useInventory';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id') && localStorage.getItem('household_member_id');

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
    localStorage.clear();
    setReady(false);
  };

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  const householdId = localStorage.getItem('household_id');
  const memberName = localStorage.getItem('member_name');

  return (
    <>
      <div className="m-auto max-w-lg p-4">
        <Header householdId={householdId} memberName={memberName} onLogout={handleLogout} />

        <div className="flex items-center justify-between mb-3">
          <Button title="New Food" action={() => setIsOpen(true)} />
          <div className="flex gap-1">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1 mb-3">
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`px-3 py-1 text-sm rounded border ${
                filterBy === o.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setFilterBy(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-50 p-4 text-center">
            <p className="text-red-600">Could not load inventory.</p>
            <button
              className="mt-2 rounded bg-red-500 px-4 py-1 text-sm text-white"
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
            <p className="mt-1 text-sm">Tap 'New Food' to add your first item.</p>
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
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
