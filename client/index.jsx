import { createRoot } from 'react-dom/client';
import './main.css';
import Onboarding from './components/Onboarding';
import { useState } from 'react';
import MainInventory from './components/MainInventory';
import Navigation from './components/ui/Navigation';

const isSetUp = () =>
  localStorage.getItem('member_id') && localStorage.getItem('household_id');

const App = () => {
  const [ready, setReady] = useState(isSetUp);
  if (!ready) {
    return (
      <main className="m-auto block flex min-h-screen max-w-md flex-col p-6">
        <Onboarding onComplete={() => setReady(true)} />
      </main>
    );
  } else {
    return (
      <main className="m-auto max-w-md p-4">
        <Navigation onReset={() => setReady(false)} />
        <MainInventory />
      </main>
    );
  }
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
