import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

const STORAGE_OPTIONS = [
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
];

const UNIT_OPTIONS = ['kg', 'g', 'L', 'mL', 'pcs', 'item'];

const FoodEditForm = ({ item, onSave, onCancel }) => {
  const [quantity, setQuantity] = useState(item.quantity ?? '');
  const [unit, setUnit] = useState(item.unit ?? 'item');
  const [storageLocation, setStorageLocation] = useState(item.storage_location ?? 'fridge');
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await axios.put(`${API}/food-inventory/${item.id}`, {
        household_id: item.household_id,
        added_by_member_id: item.added_by_member_id,
        packaged_food_id: item.packaged_food_id ?? null,
        unpackaged_food_id: item.unpackaged_food_id ?? null,
        storage_location: storageLocation,
        quantity: parseFloat(quantity),
        unit,
        expiry_date: expiryDate || null,
      });
      onSave?.();
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-4xl bg-white p-4 shadow-sm mt-3 border-l-4 border-l-blue-400">
      <p className="text-lg font-bold mb-3">Edit: {item.name}</p>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium">Quantity</label>
            <input
              className="w-full border px-2 py-1"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium">Unit</label>
            <select
              className="w-full border px-2 py-1"
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
                className={`flex-1 rounded px-3 py-1.5 text-sm border ${
                  storageLocation === opt.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
            className="w-full border px-2 py-1"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            className="rounded bg-gray-200 px-4 py-2 text-gray-700"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodEditForm;
