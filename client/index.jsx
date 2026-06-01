import { createRoot } from 'react-dom/client';
import './main.css';
import Button from './components/Button';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FoodCard from './components/inventory/FoodCard';
import { useInventory } from './hooks/useInventory';
import { useState } from 'react';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id') && localStorage.getItem('household_member_id');

const App = () => {
  const [ready, setReady] = useState(isSetUp);
  const [isOpen, setIsOpen] = useState(false);
  const { inventory, loading, refresh } = useInventory();

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  return (
    <>
      <div className="m-auto max-w-lg p-4">
        <Button title="New Food" action={() => setIsOpen(true)} />
        {loading && <p className="mt-4 text-gray-500">Loading inventory...</p>}
        {!loading && inventory.length === 0 && (
          <div className="mt-8 text-center text-gray-400">
            <p className="text-lg">Your fridge is empty!</p>
            <p className="mt-1 text-sm">Tap 'New Food' to add your first item.</p>
          </div>
        )}
        {!loading && inventory.map((item) => <FoodCard key={item.id} item={item} />)}
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} onSuccess={() => { refresh(); setIsOpen(false); }} />
      </div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
