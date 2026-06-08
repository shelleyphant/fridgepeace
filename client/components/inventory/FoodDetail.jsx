import React, { useState } from 'react';
import moment from 'moment';
import { useAddFood } from '../../hooks/useAddFood';
import Button from '../ui/Button';
import Toast from '../ui/Toast';

const FoodDetail = ({ food, inventoryItem, onSuccess, close }) => {
  const [quantity, setQuantity] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [date, setDate] = useState(
    food._source === 'foodkeeper' || food.unpackaged_food_id
      ? moment().format('YYYY-MM-DD')
      : '',
  );
  const { addFood, updateFood, error } = useAddFood();
  const [validationError, setValidationError] = useState(null);
  const [validationKey, setValidationKey] = useState(0);

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  const validate = () => {
    const missingQuantity = !quantity || isNaN(quantity) || Number(quantity) <= 0;
    const missingDate = !date;
    if (missingQuantity && missingDate) return 'Quantity and date are required';
    if (missingQuantity) return 'Please enter a valid quantity';
    if (missingDate) return 'Please enter a date';
    return null;
  };

  const calcExpiryDate = (date) => {
    if (food._source !== 'foodkeeper' || food.packaged_food_id) return date;
    const toDays = (value, metric) => {
      if (value == null || metric == null) return null;
      switch (metric.toLowerCase()) {
        case 'weeks':
          return value * 7;
        case 'months':
          return value * 30;
        case 'years':
          return value * 365;
        default:
          return value;
      }
    };
    const maxDays = Math.max(
      ...[
        toDays(food.Pantry_Max, food.Pantry_Metric),
        toDays(food.DOP_Pantry_Max, food.DOP_Pantry_Metric),
        toDays(food.Pantry_After_Opening_Max, food.Pantry_After_Opening_Metric),
        toDays(food.Refrigerate_Max, food.Refrigerate_Metric),
        toDays(food.DOP_Refrigerate_Max, food.DOP_Refrigerate_Metric),
        toDays(
          food.Refrigerate_After_Opening_Max,
          food.Refrigerate_After_Opening_Metric,
        ),
        toDays(food.Freeze_Max, food.Freeze_Metric),
        toDays(food.DOP_Freeze_Max, food.DOP_Freeze_Metric),
      ].filter((v) => v != null),
    );
    if (!isFinite(maxDays)) return date;
    return moment(date).add(maxDays, 'days').format('YYYY-MM-DD');
  };

  return (
    <div>
      {/* <pre className="mt-1 border p-2 text-xs whitespace-pre-wrap">
        {JSON.stringify(food, null, 2)}
      </pre> */}
      <span className="block">{food.Name ?? food.product_name}</span>
      <label>Quantity</label>
      <input
        className="border"
        onChange={(e) => setQuantity(e.target.value)}
        value={quantity}
        type="number"
      />
      <label>Storage location</label>
      <select
        className="border"
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
      </select>
      <label>
        {food._source === 'foodkeeper' || food.unpackaged_food_id
          ? 'Purchase Date'
          : 'Use By Date'}
      </label>
      <input
        className="border"
        onChange={(e) => setDate(e.target.value)}
        value={date}
        type="date"
      />
      <Button
        action={async () => {
          const msg = validate();
          if (msg) {
            setValidationError(msg);
            setValidationKey((k) => k + 1);
            return;
          }
          const success = inventoryItem
            ? await updateFood(inventoryItem, quantity, calcExpiryDate(date))
            : await addFood(food, {
                quantity,
                expiry_date: calcExpiryDate(date),
                storage_location: storageLocation || null,
              });
          if (success) onSuccess?.();
        }}
        title={'Add to fridge'}
      />
      <a onClick={close}>Cancel</a>
      {validationError && (
        <Toast key={validationKey} level="warning" message={validationError} />
      )}
      {apiError && <Toast key={apiError} level="error" message={apiError} />}
    </div>
  );
};

export default FoodDetail;
