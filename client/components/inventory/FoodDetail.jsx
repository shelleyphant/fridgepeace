import React, { useState } from 'react';
import moment from 'moment';
import { useAddFood } from '../../hooks/useAddFood';
import { calcExpiryDate } from '../../source/calcExpiryDate';
import { validateFoodEntry } from '../../source/validateFoodEntry';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import Input from '../ui/Input';

const FoodDetail = ({ food, inventoryItem, onSuccess, close }) => {
  const [quantity, setQuantity] = useState('');
  const [storageLocation, setStorageLocation] = useState(
    inventoryItem?.storage_location ?? '',
  );
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const { addFood, updateFood, resolveMemberId, error } = useAddFood();
  const [validationError, setValidationError] = useState(null);
  const [validationKey, setValidationKey] = useState(0);

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  return (
    <div>
      <span className="block">{food.Name ?? food.product_name ?? food.name}</span>
      <label>Quantity</label>
      <Input
        onChangeAction={(e) => setQuantity(e.target.value)}
        value={quantity}
        type="number"
      />
      <label>Storage location</label>
      <select
        className="border-water-600 relative my-4 w-full border p-4"
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
      <Input onChangeAction={(e) => setDate(e.target.value)} value={date} type="date" />
      <Button
        action={async () => {
          const msg = validateFoodEntry(food, { quantity, date, storageLocation });
          if (msg) {
            setValidationError(msg);
            setValidationKey((k) => k + 1);
            return;
          }
          const success = inventoryItem
            ? await updateFood(inventoryItem, {
                additionalQuantity: quantity,
                expiry_date: calcExpiryDate(food, storageLocation, date),
                storage_location: storageLocation,
                member_id: await resolveMemberId(inventoryItem.household_id),
              })
            : await addFood(food, {
                quantity,
                expiry_date: calcExpiryDate(food, storageLocation, date),
                storage_location: storageLocation || null,
              });
          if (success) onSuccess?.();
        }}
        title={'Add to kitchen'}
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
