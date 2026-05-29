import React, { useState } from 'react';
import { useAddFood } from '../hooks/useAddFood';

const FoodDetail = ({ food }) => {
  const [quantity, setQuantity] = useState('');
  const { addFood } = useAddFood();

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
        onClick={() => addFood(food, quantity)}
      >
        Add to fridge
      </button>
    </div>
  );
};

export default FoodDetail;
