import { createRoot } from 'react-dom/client';
import './main.css';
import Onboarding from './components/Onboarding';
import { useInventory } from './hooks/useInventory';
import { useState } from 'react';
import { useHousehold } from './hooks/useHousehold';
import MainInventory from './components/MainInventory';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id');

const App = () => {
  const [ready, setReady] = useState(isSetUp);

  const { inventory, loading, refresh } = useInventory();
  const household = useHousehold(localStorage.getItem('household_id'));

  if (!ready)
    return (
      <main className="m-auto max-w-md p-4">
        <Onboarding onComplete={() => setReady(true)} />
      </main>
    );

  return (
    <main className="m-auto max-w-md p-4">
      <MainInventory household inventory loading />
    </main>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
