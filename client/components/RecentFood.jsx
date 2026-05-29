import React, { useState } from 'react';
import { useRecentFoods } from '../hooks/useRecentFoods';
import FoodDetail from './FoodDetail';

const RecentFood = () => {
  const { recentFoods, loading, error } = useRecentFoods();
  const [selected, setSelected] = useState(null);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Failed to load recent foods.</div>;

  return (
    <div>
      <ul>
        {recentFoods.map((f) => (
          <li
            key={`${f._source}-${f.id}`}
            className="cursor-pointer p-1 hover:bg-gray-100"
            onClick={() => setSelected(f)}
          >
            {f.name}
          </li>
        ))}
      </ul>
      {selected && <FoodDetail food={selected} />}
    </div>
  );
};

export default RecentFood;
