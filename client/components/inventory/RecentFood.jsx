import React, { useState } from 'react';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import FoodDetail from './FoodDetail';
import Toast from '../ui/Toast';
import Modal from '../ui/Modal';

const RecentFood = ({ onSuccess }) => {
  const { recentFoods, loading, error } = useRecentFoods();
  const [selected, setSelected] = useState(null);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {error && <Toast level="notice" message="Failed to load recent foods." />}
      <Modal
        trigger={(open) =>
          !selected &&
          !loading &&
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
