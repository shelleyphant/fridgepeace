import React, { useState } from 'react';
import { useAddFood } from '../../hooks/useAddFood';

const FoodDetail = ({ food, inventoryItem, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const { addFood, updateFood, loading, error } = useAddFood();

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
        disabled={loading}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error.response?.data?.detail ?? error.message}
        </p>
      )}
      <button
        className="mt-2 bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
        disabled={loading}
        onClick={async () => {
          const success = inventoryItem
            ? await updateFood(inventoryItem, quantity)
            : await addFood(food, { quantity });
          if (success) onSuccess?.();
        }}
      >
        {loading ? 'Adding...' : 'Add to fridge'}
      </button>
    </div>
  );
};

export default FoodDetail;
