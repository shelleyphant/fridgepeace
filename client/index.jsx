import { createRoot } from 'react-dom/client';
import './main.css';
import Button from './components/Button';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FoodCard from './components/inventory/FoodCard';
import { useInventory } from './hooks/useInventory';
import { useState } from 'react';

const isSetUp = () =>
  !!(localStorage.getItem('member_id') && localStorage.getItem('household_id'));

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { inventory, loading } = useInventory();

  const [ready, setReady] = useState(isSetUp);

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  return (
    <>
      <div className="m-auto max-w-lg p-4">
        <Button title="New Food" action={() => setIsOpen(true)} />
        {!loading && inventory.map((item) => <FoodCard key={item.id} item={item} />)}
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
