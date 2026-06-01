import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../constants';

const STORAGE_OPTIONS = [
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
];

const UNIT_OPTIONS = ['kg', 'g', 'L', 'mL', 'pcs', 'item'];

function validateQuantity(value) {
  if (!value || String(value).trim() === '') return 'Quantity is required';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Quantity must be a number';
  if (num <= 0) return 'Quantity must be greater than 0';
  return null;
}

function validateExpiryDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Invalid date';
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 10);
  if (date > maxFuture) return 'Expiry date is too far in the future';
  return null;
}

const FoodEditForm = ({ item, onSave, onCancel }) => {
  const [quantity, setQuantity] = useState(item.quantity ?? '');
  const [unit, setUnit] = useState(item.unit ?? 'item');
  const [storageLocation, setStorageLocation] = useState(item.storage_location ?? 'fridge');
  const [expiryDate, setExpiryDate] = useState(item.expiry_date ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({});

  const quantityError = touched.quantity ? validateQuantity(quantity) : null;
  const expiryError = touched.expiryDate ? validateExpiryDate(expiryDate) : null;
  const hasErrors = !!validateQuantity(quantity) || !!validateExpiryDate(expiryDate);

  const handleSave = async () => {
    setTouched({ quantity: true, expiryDate: true });
    if (hasErrors) return;

    setLoading(true);
    setError(null);
    try {
      await axios.put(`${API_URL}/food-inventory/${item.id}`, {
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
    <div className="rounded-2xl bg-white p-4 shadow-sm mt-3 border-l-4 border-l-water-400">
      <p className="text-lg font-bold mb-3">Edit: {item.name}</p>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium">Quantity <span className="text-red-500">*</span></label>
            <input
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
                quantityError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-water-500 focus:ring-water-500'
              }`}
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, quantity: true }))}
              disabled={loading}
            />
            {quantityError && (
              <p className="mt-0.5 text-xs text-red-500">{quantityError}</p>
            )}
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium">Unit <span className="text-red-500">*</span></label>
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
          <label className="block text-sm font-medium">Storage Location <span className="text-red-500">*</span></label>
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
          <label className="block text-sm font-medium">Expiry Date</label>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
              expiryError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-water-500 focus:ring-water-500'
            }`}
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, expiryDate: true }))}
            disabled={loading}
          />
          {expiryError && (
            <p className="mt-0.5 text-xs text-red-500">{expiryError}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-full bg-water-600 px-6 py-2 text-center text-sm font-medium text-white disabled:opacity-50 hover:bg-water-700"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            className="rounded-full bg-gray-100 px-4 py-2 text-center text-sm text-gray-600 hover:bg-gray-200"
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
