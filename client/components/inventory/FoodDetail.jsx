import React, { useState } from 'react';
import moment from 'moment';
import { useAddFood } from '../../hooks/useAddFood';
import { calcExpiryDate } from '../../source/calcExpiryDate';
import { validateFoodEntry } from '../../source/validateFoodEntry';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import Input from '../ui/Input';
import Select from '../ui/Select';

const FoodDetail = ({
  food,
  inventoryItem,
  initialQuantity = '',
  quantityMode = 'delta',
  submitLabel = 'Add to kitchen',
  onSuccess,
  onCancel,
  extraFields,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [storageLocation, setStorageLocation] = useState(
    inventoryItem?.storage_location ?? '',
  );
  const [date, setDate] = useState(
    inventoryItem?.expiry_date ?? moment().format('YYYY-MM-DD'),
  );
  const { addFood, updateFood, resolveMemberId, error } = useAddFood();
  const [validationError, setValidationError] = useState(null);
  const [validationKey, setValidationKey] = useState(0);

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  const handleSubmit = async () => {
    const msg = validateFoodEntry(food, { quantity, date, storageLocation });
    if (msg) {
      setValidationError(msg);
      setValidationKey((k) => k + 1);
      return;
    }

    const success = inventoryItem
      ? await updateFood(inventoryItem, {
          additionalQuantity:
            quantityMode === 'absolute'
              ? parseFloat(quantity) - parseFloat(inventoryItem.quantity)
              : quantity,
          expiry_date: calcExpiryDate(food, storageLocation, date),
          storage_location: storageLocation,
          member_id:
            quantityMode === 'delta'
              ? await resolveMemberId(inventoryItem.household_id)
              : undefined,
        })
      : await addFood(food, {
          quantity,
          expiry_date: calcExpiryDate(food, storageLocation, date),
          storage_location: storageLocation || null,
        });
    if (success) onSuccess?.();
  };

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

      <label>
        {food._source === 'foodkeeper' || food.unpackaged_food_id
          ? 'Purchase Date'
          : 'Use By Date'}
      </label>
      <Input onChangeAction={(e) => setDate(e.target.value)} value={date} type="date" />

      {extraFields}

      <Button action={handleSubmit} title={submitLabel} />
      {onCancel && <a onClick={onCancel}>Cancel</a>}
      {validationError && (
        <Toast key={validationKey} level="warning" message={validationError} />
      )}
      {apiError && <Toast key={apiError} level="error" message={apiError} />}
    </div>
  );
};

export default FoodDetail;
