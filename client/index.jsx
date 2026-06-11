import { createRoot } from 'react-dom/client';
import './main.css';
import Onboarding from './components/Onboarding';
import { useState } from 'react';
import MainInventory from './components/MainInventory';
import Navigation from './components/ui/Navigation';
import { useHousehold } from './hooks/useHousehold';
import Drawer from './components/ui/Drawer';
import Button from './components/ui/Button';
import AddFood from './components/inventory/AddFood';
import { useInventory } from './hooks/useInventory';
import { useMembers } from './hooks/useMembers';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id');

const App = () => {
  const [ready, setReady] = useState(isSetUp);
  const [toast, setToast] = useState(null);
  const household = useHousehold(localStorage.getItem('household_id'));
  const { members } = useMembers(localStorage.getItem('household_id'));
  const { inventory, loading, refresh } = useInventory(
    localStorage.getItem('household_id'),
    members,
  );

  if (!ready) {
    return (
      <main className="m-auto block flex min-h-screen max-w-md flex-col p-6">
        <Onboarding onComplete={() => setReady(true)} />
      </main>
    );
  } else {
    return (
      <main className="relative m-auto h-screen max-w-md overflow-scroll p-4">
        <header className="to-water-50 fixed top-0 left-0 z-10 w-full bg-linear-to-t from-transparent to-50% p-4">
          <Navigation onReset={() => setReady(false)} />
          <h1 className="text-water-800 font-sansation text-4xl font-bold">
            {household?.name}
          </h1>
          <span>{household?.id}</span>
          <Drawer trigger={(open) => <Button title="Add a Food" action={open} />}>
            {(close) => (
              <AddFood
                onClose={close}
                inventory={inventory}
                onSuccess={() => {
                  refresh();
                  close();
                  setToast({
                    id: Date.now(),
                    level: 'success',
                    message: 'Food added to kitchen!',
                  });
                }}
              />
            )}
          </Drawer>
        </header>
        <MainInventory
          inventory={inventory}
          loading={loading}
          refresh={refresh}
          members={members}
        />
      </main>
    );
  }
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
