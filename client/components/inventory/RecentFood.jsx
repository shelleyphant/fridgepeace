import React, { useState } from 'react';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import FoodDetail from './FoodDetail';
import Modal from '../ui/Modal';

const RecentFood = ({ inventory, onSuccess }) => {
  const { recentFoods } = useRecentFoods(inventory);
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <Modal
        trigger={(open) =>
          !selected &&
          recentFoods.length > 0 && (
            <ul>
              {recentFoods.map((item) => (
                <li
                  key={item.id}
                  className="cursor-pointer p-1 hover:bg-gray-100"
                  onClick={() => {
                    setSelected(item);
                    open();
                  }}
                >
                  {item.name}
                </li>
              ))}
            </ul>
          )
        }
      >
        {(close) => (
          <FoodDetail food={selected} onSuccess={onSuccess} close={close} />
        )}
      </Modal>
    </div>
  );
};

export default RecentFood;
