import React, { useState } from 'react';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import FoodCard from './inventory/FoodCard';
import Toast from './ui/Toast';
import { useHousehold } from '../hooks/useHousehold';
import { useInventory } from '../hooks/useInventory';
import AddFood from './inventory/AddFood';

const MainInventory = () => {
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
      <Drawer trigger={(open) => <Button title="New Food" action={open} />}>
        {(close) => (
          <AddFood
            onClose={close}
            onSuccess={() => {
              refresh();
              close();
              setToast({
                id: Date.now(),
                level: 'success',
                message: 'Food added to fridge!',
              });
            }}
          />
        )}
      </Drawer>
      {!loading && inventory.map((item) => <FoodCard key={item.id} item={item} />)}
      {toast && <Toast key={toast.id} level={toast.level} message={toast.message} />}
    </>
  );
};

export default MainInventory;
