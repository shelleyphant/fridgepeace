import React, { useState } from 'react';
import moment from 'moment';
import axios from 'axios';
import { useAddFood } from '../../hooks/useAddFood';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import Input from '../ui/Input';

const API = process.env.API_URL ?? '';

const AIInsert = ({ food, extras = {}, onSuccess, onCancel }) => {
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const { addFood, error } = useAddFood();

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  const isPackaged = food._source === 'packaged';
  const storageLocation = extras?.storage_location ?? '';

  const [date, setDate] = useState(() => {
    if (isPackaged) {
      return extras?.expiry_date || moment().format('YYYY-MM-DD');
    }
    const loc = (extras?.storage_location || '').toLowerCase();
    let minDays = null;
    if (loc === 'fridge') minDays = food.fridge_days_min;
    else if (loc === 'freezer') minDays = food.freezer_days_min;
    else if (loc === 'pantry' || loc === 'counter') minDays = food.pantry_days_min;
    if (minDays != null && extras?.purchase_date) {
      return moment(extras.purchase_date).add(minDays, 'days').format('YYYY-MM-DD');
    }
    return moment().format('YYYY-MM-DD');
  });

  const handleSubmit = async () => {
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) return;
    setSaving(true);

    try {
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
        expiry_date: date,
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

      <label className="text-water-700 mt-4 block text-sm font-medium">
        {isPackaged ? 'Use By Date' : 'Best Before (auto-calculated)'}
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
