import React from 'react';
import NewFood from './NewFood';
import RecentFood from './RecentFood';

const AddFood = ({ onClose }) => {
  return (
    <div>
      <RecentFood onSuccess={onClose} />
      <NewFood onSuccess={onClose} />
    </div>
  );
};

export default AddFood;
