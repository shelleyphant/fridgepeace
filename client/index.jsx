import { createRoot } from 'react-dom/client';
import FoodCard from './components/FoodCard';
import './main.css';

const App = () => {
  return (
    <>
      <div className="p-4">
        <FoodCard />
      </div>
      <div></div>
    </>
  );
};
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
