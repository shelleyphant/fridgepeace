import { createRoot } from 'react-dom/client';
import './main.css';
import Button from './components/Button';
import Drawer from './components/Drawer';
import { useState } from 'react';

const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="m-auto max-w-lg p-4">
        <Button title="New Food" action={() => setIsOpen(true)}></Button>
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
      <div></div>
    </>
  );
};
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
