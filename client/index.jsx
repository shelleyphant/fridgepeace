import { createRoot } from 'react-dom/client';
import './main.css';
import Onboarding from './components/Onboarding';
import FoodCard from './components/FoodCard';
import { useState } from 'react';

const isSetUp = () =>
  !!(localStorage.getItem('member_id') && localStorage.getItem('household_id'));

const App = () => {
  const [ready, setReady] = useState(isSetUp);

  if (!ready) return <Onboarding onComplete={() => setReady(true)} />;

  return (
    <>
      <FoodCard />
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
