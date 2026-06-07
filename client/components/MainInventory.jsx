import React, { useState } from 'react';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import FoodCard from './inventory/FoodCard';
import Toast from './ui/Toast';
import { useHousehold } from '../hooks/useHousehold';
import { useInventory } from '../hooks/useInventory';

const MainInventory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const { inventory, loading, refresh } = useInventory();
  const household = useHousehold(localStorage.getItem('household_id'));

  return (
    <>
      <h1 className="text-water-800 font-sansation text-4xl font-bold">
        {household?.name}
      </h1>
      <span>{household?.id}</span>
      <hr className="h-8 border-0" />
      <Button title="New Food" action={() => setIsOpen(true)} />
      {!loading && inventory.map((item) => <FoodCard key={item.id} item={item} />)}
      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          refresh();
          setIsOpen(false);
          setToast({
            id: Date.now(),
            level: 'success',
            message: 'Food added to fridge!',
          });
        }}
      />
      {toast && <Toast key={toast.id} level={toast.level} message={toast.message} />}
    </>
  );
};

export default MainInventory;
