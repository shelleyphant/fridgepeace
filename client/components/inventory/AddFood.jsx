import React from 'react';
import NewFood from './NewFood';
import RecentFood from './RecentFood';
import { useRecentFoods } from '../../hooks/useRecentFoods';

const AddFood = ({ onClose, onSuccess, inventory }) => {
  const { recentFoods } = useRecentFoods(inventory);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {recentFoods.length > 0 && (
        <span className="text-water-800 text-lg font-medium">Recently Added:</span>
      )}
      <RecentFood inventory={inventory} onSuccess={onSuccess ?? onClose} />
      <span className="text-water-800 mt-6 text-lg font-medium">
        Find something new!
      </span>
      <NewFood onSuccess={onSuccess ?? onClose} />
    </div>
  );
};

export default AddFood;
