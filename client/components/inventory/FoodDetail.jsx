import React, { useState } from 'react';
import { useAddFood } from '../../hooks/useAddFood';

const STORAGE_OPTIONS = [
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
];

const UNIT_OPTIONS = ['kg', 'g', 'L', 'mL', 'pcs', 'item'];

const FoodDetail = ({ food, inventoryItem, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('item');
  const [storageLocation, setStorageLocation] = useState('fridge');
  const [expiryDate, setExpiryDate] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { addFood, updateFood, loading, error } = useAddFood();

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;

    const details = { quantity, unit, storage_location: storageLocation, expiry_date: expiryDate || null };

    const success = inventoryItem
      ? await updateFood(inventoryItem, quantity)
      : await addFood(food, details);

    if (success) {
      setSuccessMsg('Added to fridge!');
      setTimeout(() => onSuccess?.(), 800);
    }
  };

  const isUpdate = !!inventoryItem;
  const foodName = food.food_name ?? food.name ?? food.product_name ?? 'Unknown';
  const foodBrand = food.food_brand ?? food.brand ?? null;
  const foodCategory = food.food_category ?? food.category ?? null;

  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-lg font-semibold">{foodName}</p>
        {foodBrand && <p className="text-sm text-gray-600">{foodBrand}</p>}
        {foodCategory && <p className="text-sm text-gray-500">{foodCategory}</p>}
        {food.fridge_days_min != null && (
          <p className="mt-1 text-xs text-gray-400">
            Recommended storage:{' '}
            {food.fridge_days_min != null && `Fridge ${food.fridge_days_min}–${food.fridge_days_max ?? ''} days`}
            {food.fridge_days_min != null && food.freezer_days_min != null && ' | '}
            {food.freezer_days_min != null && `Freezer ${food.freezer_days_min}–${food.freezer_days_max ?? ''} days`}
            {food.freezer_days_min != null && food.pantry_days_min != null && ' | '}
            {food.pantry_days_min != null && `Pantry ${food.pantry_days_min}–${food.pantry_days_max ?? ''} days`}
          </p>
        )}
      </div>

      {inventoryItem && (
        <div className="rounded-lg bg-yellow-50 p-2 text-sm text-yellow-800">
          Currently in fridge: <strong>{inventoryItem.quantity} {inventoryItem.unit}</strong>.
          How many more do you want to add?
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Quantity</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
            onChange={(e) => setQuantity(e.target.value)}
            value={quantity}
            type="number"
            min="0"
            step="any"
            disabled={loading}
          />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium">Unit</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={loading}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Storage Location</label>
        <div className="mt-1 flex gap-2">
          {STORAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex-1 rounded-full px-3 py-1.5 text-center text-sm border ${
                storageLocation === opt.value
                  ? 'bg-water-600 text-white border-water-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setStorageLocation(opt.value)}
              disabled={loading}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Expiry Date (optional)</label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error.response?.data?.detail ?? error.message}
        </p>
      )}

      {successMsg && (
        <p className="text-sm text-green-600">{successMsg}</p>
      )}

      <button
        className="mt-2 w-full rounded-full bg-water-600 px-6 py-2 text-center text-sm font-medium text-white disabled:opacity-50 hover:bg-water-700"
        disabled={loading || successMsg !== ''}
        onClick={handleSubmit}
      >
        {loading ? 'Adding...' : isUpdate ? 'Add more to existing' : 'Add to fridge'}
      </button>
    </div>
  );
};

export default FoodDetail;
