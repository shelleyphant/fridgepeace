import React, { useState } from 'react';
import FoodCard from './inventory/FoodCard';
import FoodCardStack from './inventory/FoodCardStack';
import Toast from './ui/Toast';

const MainInventory = ({ inventory, loading, refresh }) => {
  const [toast, setToast] = useState(null);

  return (
    <div className="mt-40">
      {!loading &&
        Object.values(
          inventory.reduce((groups, item) => {
            const key =
              item.packaged_food_id ?? `unpackaged-${item.unpackaged_food_id}`;
            (groups[key] ??= []).push(item);
            return groups;
          }, {}),
        ).map((group) =>
          group.length > 1 ? (
            <FoodCardStack
              className="my-6"
              key={group[0].id}
              items={group}
              onChange={refresh}
            />
          ) : (
            <FoodCard
              className="my-6"
              key={group[0].id}
              item={group[0]}
              onChange={refresh}
            />
          ),
        )}

      {toast && <Toast key={toast.id} level={toast.level} message={toast.message} />}
    </div>
  );
};

export default MainInventory;
