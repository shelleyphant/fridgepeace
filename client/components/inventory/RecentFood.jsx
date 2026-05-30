import React, { useState } from 'react';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import FoodDetail from './FoodDetail';

const RecentFood = ({ onSuccess }) => {
  const { recentFoods, loading, error } = useRecentFoods();
  const [selected, setSelected] = useState(null);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Failed to load recent foods.</div>;

  return (
    <div>
      <ul>
        {recentFoods.map((item) => (
          <li
            key={item.id}
            className="cursor-pointer p-1 hover:bg-gray-100"
            onClick={() => setSelected(item)}
          >
            {item.name}
          </li>
        ))}
      </ul>
      {selected && <FoodDetail food={selected} inventoryItem={selected} onSuccess={onSuccess} />}
    </div>
  );
};

export default RecentFood;
