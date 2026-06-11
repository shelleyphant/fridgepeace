import React from 'react';
import NewFood from './NewFood';
import RecentFood from './RecentFood';

const AddFood = ({ onClose, onSuccess, inventory }) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RecentFood inventory={inventory} onSuccess={onSuccess ?? onClose} />
      <NewFood onSuccess={onSuccess ?? onClose} />
    </div>
  );
};

export default AddFood;
