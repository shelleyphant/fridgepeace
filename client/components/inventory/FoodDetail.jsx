import React, { useState, useEffect, useMemo } from 'react';
import { useAddFood } from '../../hooks/useAddFood';
import { useFoodEvents } from '../../hooks/useFoodEvents';
import { useFoodOwnership } from '../../hooks/useFoodOwnership';
import { STORAGE_KEYS } from '../../constants';
import EventTimeline from './EventTimeline';
import OwnerBadge from './OwnerBadge';

const STORAGE_OPTIONS = [
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
];

const UNIT_OPTIONS = ['kg', 'g', 'L', 'mL', 'pcs', 'item'];

function validateQuantity(value) {
  if (!value || value.trim() === '') return 'Quantity is required';
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

const FoodDetail = ({ food, inventoryItem, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('item');
  const [storageLocation, setStorageLocation] = useState('fridge');
  const [expiryDate, setExpiryDate] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [claimOnAdd, setClaimOnAdd] = useState(true);
  const [touched, setTouched] = useState({});
  const { addFood, updateFood, loading, error } = useAddFood();
  const { events, loading: eventsLoading, error: eventsError, fetchEvents } = useFoodEvents();
  const { ownerships, fetchOwnerships, claimOwnership, removeOwnership } = useFoodOwnership();
  const householdMemberId = parseInt(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID));

  const inventoryItemId = inventoryItem?.id ?? null;
  const isOwner = inventoryItemId && ownerships.some((o) => o.member_id === householdMemberId);
  const [unclaiming, setUnclaiming] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (inventoryItemId) {
      fetchEvents(inventoryItemId);
      fetchOwnerships(inventoryItemId);
    }
  }, [inventoryItemId]);

  const handleSetAsShared = async () => {
    setUnclaiming(true);
    const success = await removeOwnership(inventoryItemId, householdMemberId);
    if (success) {
      fetchOwnerships(inventoryItemId);
    }
    setUnclaiming(false);
  };

  const handleClaim = async () => {
    setClaiming(true);
    const success = await claimOwnership(inventoryItemId, householdMemberId);
    if (success) {
      fetchOwnerships(inventoryItemId);
    }
    setClaiming(false);
  };

  let ownerDisplayName = null;
  if (isOwner) {
    ownerDisplayName = 'You';
  } else if (inventoryItem?.owner_display_name) {
    ownerDisplayName = inventoryItem.owner_display_name;
  }

  const quantityError = touched.quantity ? validateQuantity(quantity) : null;
  const expiryError = touched.expiryDate ? validateExpiryDate(expiryDate) : null;
  const hasErrors = !!validateQuantity(quantity) || !!validateExpiryDate(expiryDate);

  const handleSubmit = async () => {
    setTouched({ quantity: true, expiryDate: true });
    if (hasErrors) return;

    const details = { quantity, unit, storage_location: storageLocation, expiry_date: expiryDate || null };

    const success = inventoryItem
      ? await updateFood(inventoryItem, quantity, claimOnAdd)
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

  const shelfLife = useMemo(() => {
    const fk = ['fridge_days_min', 'fridge_days_max', 'freezer_days_min', 'freezer_days_max', 'pantry_days_min', 'pantry_days_max'];
    if (fk.some((k) => food[k] != null)) {
      return {
        fridge: { min: food.fridge_days_min, max: food.fridge_days_max },
        freezer: { min: food.freezer_days_min, max: food.freezer_days_max },
        pantry: { min: food.pantry_days_min, max: food.pantry_days_max },
      };
    }
    return null;
  }, [food]);

  const suggestedExpiryDate = useMemo(() => {
    if (!shelfLife || !storageLocation) return null;
    const locData = shelfLife[storageLocation];
    if (!locData || locData.max == null) return null;
    const d = new Date();
    d.setDate(d.getDate() + locData.max);
    return d.toISOString().split('T')[0];
  }, [shelfLife, storageLocation]);

  useEffect(() => {
    if (shelfLife) {
      const preferred = ['fridge', 'freezer', 'pantry'].find(
        (loc) => shelfLife[loc]?.max != null
      );
      if (preferred) {
        setStorageLocation(preferred);
      }
    }
  }, [shelfLife]);

  useEffect(() => {
    if (suggestedExpiryDate && !expiryDate && !touched.expiryDate) {
      setExpiryDate(suggestedExpiryDate);
    }
  }, [suggestedExpiryDate]);

  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-lg font-semibold">{foodName}</p>
        {foodBrand && <p className="text-sm text-gray-600">{foodBrand}</p>}
        {foodCategory && <p className="text-sm text-gray-500">{foodCategory}</p>}
        {inventoryItemId && (
          <div className="mt-1">
            <OwnerBadge ownerNames={inventoryItem?.owner_display_names ?? (ownerDisplayName ? [ownerDisplayName] : [])} />
          </div>
        )}
        {shelfLife && (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-xs font-medium text-gray-500">Recommended storage:</p>
            {shelfLife.fridge?.max != null && (
              <p className="text-xs text-gray-400">🧊 Fridge: {shelfLife.fridge.min}–{shelfLife.fridge.max} days</p>
            )}
            {shelfLife.freezer?.max != null && (
              <p className="text-xs text-gray-400">❄️ Freezer: {shelfLife.freezer.min}–{shelfLife.freezer.max} days</p>
            )}
            {shelfLife.pantry?.max != null && (
              <p className="text-xs text-gray-400">📦 Pantry: {shelfLife.pantry.min}–{shelfLife.pantry.max} days</p>
            )}
          </div>
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
          <label className="block text-sm font-medium">Quantity <span className="text-red-500">*</span></label>
          <input
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
              quantityError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-water-500 focus:ring-water-500'
            }`}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, quantity: true }))}
            value={quantity}
            type="number"
            min="0"
            step="any"
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
            <div key={opt.value} className="flex-1">
              <button
                type="button"
                className={`w-full rounded-full px-3 py-1.5 text-center text-sm border ${
                  storageLocation === opt.value
                    ? 'bg-water-600 text-white border-water-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setStorageLocation(opt.value)}
                disabled={loading}
              >
                {opt.label}
              </button>
              {shelfLife?.[opt.value]?.max != null && (
                <p className="mt-0.5 text-[10px] text-gray-400 text-center">
                  ~{shelfLife[opt.value].max} days
                </p>
              )}
              {shelfLife?.[opt.value] == null && (
                <p className="mt-0.5 text-[10px] text-gray-300 text-center">—</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Expiry Date</label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
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
          </div>
          {suggestedExpiryDate && (
            <button
              className={`mb-0.5 rounded-full px-3 py-2 text-xs whitespace-nowrap ${
                expiryDate === suggestedExpiryDate
                  ? 'bg-green-100 text-green-700'
                  : 'bg-water-50 text-water-600 hover:bg-water-100'
              }`}
              onClick={() => setExpiryDate(suggestedExpiryDate)}
              disabled={loading}
            >
              {expiryDate === suggestedExpiryDate ? '✓ Suggested' : 'Use suggested'}
            </button>
          )}
        </div>
        {expiryError && (
          <p className="mt-0.5 text-xs text-red-500">{expiryError}</p>
        )}
        {suggestedExpiryDate && expiryDate && expiryDate !== suggestedExpiryDate && (
          <p className="mt-0.5 text-xs text-amber-600">
            Recommended: {suggestedExpiryDate}
            <button
              className="ml-1 text-water-600 underline"
              onClick={() => setExpiryDate(suggestedExpiryDate)}
            >
              Apply
            </button>
          </p>
        )}
      </div>

      {isUpdate && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={claimOnAdd}
            onChange={(e) => setClaimOnAdd(e.target.checked)}
            className="rounded border-gray-300 text-water-600 focus:ring-water-500"
          />
          Claim ownership when adding
        </label>
      )}

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

      {inventoryItemId && (
        <EventTimeline events={events} loading={eventsLoading} error={eventsError} />
      )}

      {isOwner && (
        <button
          className="w-full rounded-full border border-amber-300 px-6 py-2 text-center text-sm font-medium text-amber-700 disabled:opacity-50 hover:bg-amber-50"
          disabled={unclaiming}
          onClick={handleSetAsShared}
        >
          {unclaiming ? 'Setting...' : 'Set as shared'}
        </button>
      )}

      {!isOwner && inventoryItemId && (
        <button
          className="w-full rounded-full border border-emerald-300 px-6 py-2 text-center text-sm font-medium text-emerald-700 disabled:opacity-50 hover:bg-emerald-50"
          disabled={claiming}
          onClick={handleClaim}
        >
          {claiming ? 'Claiming...' : 'Claim as mine'}
        </button>
      )}
    </div>
  );
};

export default FoodDetail;
