import React, { useState } from 'react';
import moment from 'moment';
import { useAddFood } from '../../hooks/useAddFood';
import Button from '../ui/Button';
import Toast from '../ui/Toast';
import Input from '../ui/Input';

const FoodDetail = ({ food, inventoryItem, onSuccess, close }) => {
  const [quantity, setQuantity] = useState('');
  const [storageLocation, setStorageLocation] = useState(
    inventoryItem?.storage_location ?? '',
  );
  const [date, setDate] = useState(
    food._source === 'foodkeeper' || food.unpackaged_food_id
      ? moment().format('YYYY-MM-DD')
      : '',
  );
  const { addFood, updateFood, resolveMemberId, error } = useAddFood();
  const [validationError, setValidationError] = useState(null);
  const [validationKey, setValidationKey] = useState(0);

  const apiError = Array.isArray(error?.response?.data?.detail)
    ? error.response.data.detail.map((d) => d.msg).join(', ')
    : (error?.response?.data?.detail ?? error?.message ?? null);

  const locationMaxFields = {
    fridge: ['Refrigerate_Max', 'DOP_Refrigerate_Max', 'Refrigerate_After_Opening_Max'],
    freezer: ['Freeze_Max', 'DOP_Freeze_Max'],
    pantry: ['Pantry_Max', 'DOP_Pantry_Max', 'Pantry_After_Opening_Max'],
    counter: ['Pantry_Max', 'DOP_Pantry_Max', 'Pantry_After_Opening_Max'],
  };

  const validate = () => {
    const missingQuantity = !quantity || isNaN(quantity) || Number(quantity) <= 0;
    const missingDate = !date;
    const missingLocation = !storageLocation;
    if (missingQuantity && missingDate) return 'Quantity and date are required';
    if (missingQuantity) return 'Please enter a valid quantity';
    if (missingDate) return 'Please enter a date';
    if (missingLocation) return 'Please select a storage location';
    if (
      food._source === 'foodkeeper' &&
      !food.packaged_food_id &&
      locationMaxFields[storageLocation]?.every((f) => food[f] == null)
    )
      return 'Unsuitable storage location';
    if (food._source === 'unpackaged') {
      const storedDays = {
        fridge: food.fridge_days_max,
        freezer: food.freezer_days_max,
        pantry: food.pantry_days_max,
        counter: food.pantry_days_max,
      };
      if (storedDays[storageLocation] == null) return 'Unsuitable storage location';
    }
    return null;
  };

  const storedDaysByLocation = {
    fridge: food.fridge_days_max,
    freezer: food.freezer_days_max,
    pantry: food.pantry_days_max,
    counter: food.pantry_days_max,
  };

  const calcExpiryDate = (date) => {
    if (food._source === 'unpackaged') {
      const days = storedDaysByLocation[storageLocation];
      if (!days) return date;
      return moment(date).add(days, 'days').format('YYYY-MM-DD');
    }
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
    const pantryFields = [
      ['Pantry_Max', 'Pantry_Metric'],
      ['DOP_Pantry_Max', 'DOP_Pantry_Metric'],
      ['Pantry_After_Opening_Max', 'Pantry_After_Opening_Metric'],
    ];
    const fridgeFields = [
      ['Refrigerate_Max', 'Refrigerate_Metric'],
      ['DOP_Refrigerate_Max', 'DOP_Refrigerate_Metric'],
      ['Refrigerate_After_Opening_Max', 'Refrigerate_After_Opening_Metric'],
    ];
    const freezerFields = [
      ['Freeze_Max', 'Freeze_Metric'],
      ['DOP_Freeze_Max', 'DOP_Freeze_Metric'],
    ];
    const fieldsByLocation = {
      fridge: fridgeFields,
      freezer: freezerFields,
      pantry: pantryFields,
      counter: pantryFields,
    };

    const fields = fieldsByLocation[storageLocation] ?? [
      ...pantryFields,
      ...fridgeFields,
      ...freezerFields,
    ];
    const maxDays = Math.max(
      ...fields
        .map(([maxKey, metricKey]) => toDays(food[maxKey], food[metricKey]))
        .filter((v) => v != null),
    );
    if (!isFinite(maxDays)) return date;
    return moment(date).add(maxDays, 'days').format('YYYY-MM-DD');
  };

  return (
    <div>
      {/* <pre className="mt-1 border p-2 text-xs whitespace-pre-wrap">
        {JSON.stringify(food, null, 2)}
      </pre> */}
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
          const msg = validate();
          if (msg) {
            setValidationError(msg);
            setValidationKey((k) => k + 1);
            return;
          }
          const success = inventoryItem
            ? await updateFood(inventoryItem, {
                additionalQuantity: quantity,
                expiry_date: calcExpiryDate(date),
                storage_location: storageLocation,
                member_id: await resolveMemberId(inventoryItem.household_id),
              })
            : await addFood(food, {
                quantity,
                expiry_date: calcExpiryDate(date),
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
