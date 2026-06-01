import React, { useState } from 'react';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import FoodDetail from './FoodDetail';

const RecentFood = ({ onSuccess }) => {
  const { recentFoods, loading, error } = useRecentFoods();
  const [selected, setSelected] = useState(null);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Failed to load recent foods.</div>;
  if (recentFoods.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="text-sm font-medium text-gray-500 mb-1">Recently added</p>
      <ul>
        {recentFoods.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between cursor-pointer rounded px-2 py-1.5 hover:bg-gray-100"
            onClick={() => setSelected(item)}
          >
            <span>{item.name}</span>
            {item.quantity && (
              <span className="text-xs text-gray-400">{item.quantity} {item.unit}</span>
            )}
          </li>
        ))}
      </ul>
      {selected && <FoodDetail food={selected} inventoryItem={selected} onSuccess={onSuccess} />}
    </div>
  );
};

export default RecentFood;
