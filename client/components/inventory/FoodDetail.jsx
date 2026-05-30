import React, { useState } from 'react';
import { useAddFood } from '../../hooks/useAddFood';

const FoodDetail = ({ food, inventoryItem, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const { addFood, updateFood } = useAddFood();

  return (
    <div>
      <pre className="mt-1 border p-2 text-xs whitespace-pre-wrap">
        {JSON.stringify(food, null, 2)}
      </pre>
      <label>Quantity</label>
      <input
        className="border"
        onChange={(e) => setQuantity(e.target.value)}
        value={quantity}
        type="number"
      />
      <button
        className="mt-2 bg-blue-500 px-4 py-2 text-white"
        onClick={async () => {
          const success = inventoryItem
            ? await updateFood(inventoryItem, quantity)
            : await addFood(food, { quantity });
          if (success) onSuccess?.();
        }}
      >
        Add to fridge
      </button>
    </div>
  );
};

export default FoodDetail;
