import React, { useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import { useAddFood } from '../../hooks/useAddFood';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import Input from '../ui/Input';
import Select from '../ui/Select';

const API = process.env.API_URL ?? '';

const AIInsert = ({ food, extras = {}, onSuccess, onCancel }) => {
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [storageLocation, setStorageLocation] = useState(
    extras?.storage_location ?? '',
  );
  const [date, setDate] = useState(() => {
    if (extras?.purchase_date) return extras.purchase_date;
    if (extras?.expiry_date) return extras.expiry_date;
    return moment().format('YYYY-MM-DD');
  });
  const { addFood, error } = useAddFood();

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  const isPackaged = food._source === 'packaged';

  const handleSubmit = async () => {
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) return;
    setSaving(true);

    try {
      // For AI-scanned packaged food without a packaged_food_id, create the record first
      let foodToSave = food;
      if (isPackaged && !food.packaged_food_id) {
        const { data: created } = await axios.post(
          `${API}/packaged-foods/`,
          {
            barcode: null,
            name: food.product_name,
            brand: food.brands ?? null,
            image_url: null,
            category: food.categories ?? null,
            nutrition: null,
          },
          { headers: { 'content-type': 'application/json' } },
        );
        foodToSave = { ...food, packaged_food_id: created.id };
      }

      const success = await addFood(foodToSave, {
        quantity: String(quantity),
        expiry_date: isPackaged ? date : null,
        storage_location: isPackaged ? null : (storageLocation || null),
      });

      if (success) onSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <span className="text-water-800 mt-2 block text-lg font-medium">
        {food.Name ?? food.product_name ?? food.name}
      </span>

      <label className="text-water-700 mt-4 block text-sm font-medium">Quantity</label>
      <Input
        onChangeAction={(e) => setQuantity(e.target.value)}
        value={quantity}
        type="number"
      />

      {!isPackaged && (
        <>
          <label className="text-water-700 mt-4 block text-sm font-medium">
            Storage location
          </label>
          <Select
            onChange={(e) => setStorageLocation(e.target.value)}
            value={storageLocation}
          >
            <option value="" disabled>
              Select a location
            </option>
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
            <option value="counter">Counter</option>
          </Select>
        </>
      )}

      <label className="text-water-700 mt-4 block text-sm font-medium">
        {isPackaged ? 'Use By Date' : 'Purchase Date'}
      </label>
      <Input
        onChangeAction={(e) => setDate(e.target.value)}
        value={date}
        type="date"
      />

      <div className="mt-6 flex flex-col gap-3">
        <Button action={handleSubmit} title={saving ? 'Saving...' : 'Add to kitchen'} className="flex-1" />
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-water-600 cursor-pointer self-center text-sm underline"
          >
            Cancel
          </button>
        )}
      </div>

      {apiError && <Toast level="error" message={apiError} />}
    </div>
  );
};

export default AIInsert;
