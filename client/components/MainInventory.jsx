import React, { useState } from 'react';
import Button from './Button';
import Drawer from './Drawer';
import FoodCard from './inventory/FoodCard';

const MainInventory = ({ household, inventory, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
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
        }}
      />
    </>
  );
};

export default MainInventory;
