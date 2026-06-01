import { createRoot } from 'react-dom/client';
import './main.css';
import Button from './components/Button';
import Drawer from './components/Drawer';
import Onboarding from './components/Onboarding';
import FoodCard from './components/inventory/FoodCard';
import { useInventory } from './hooks/useInventory';
import { useState } from 'react';
import { useHousehold } from './hooks/useHousehold';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id');

const App = () => {
  const [ready, setReady] = useState(isSetUp);
  const [isOpen, setIsOpen] = useState(false);
  const { inventory, loading, refresh } = useInventory();
  const household = useHousehold(localStorage.getItem('household_id'));

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  return (
    <>
      <div className="m-auto max-w-lg p-4">
        <h1 className="text-water-800 font-sansation text-4xl font-bold">
          {household?.name}
        </h1>
        <span>{household?.id}</span>
        <hr className="h-8 border-0" />
        <Button title="New Food" action={() => setIsOpen(true)} />
        {!loading && inventory.map((item) => <FoodCard key={item.id} item={item} />)}
        <Drawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            refresh();
            setIsOpen(false);
          }}
        />
      </div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
