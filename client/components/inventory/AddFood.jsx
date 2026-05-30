import React from 'react';
import NewFood from './NewFood';
import RecentFood from './RecentFood';

const AddFood = ({ onClose, onSuccess }) => {
  return (
    <div>
      <RecentFood onSuccess={onSuccess ?? onClose} />
      <NewFood onSuccess={onSuccess ?? onClose} />
    </div>
  );
};

export default AddFood;
