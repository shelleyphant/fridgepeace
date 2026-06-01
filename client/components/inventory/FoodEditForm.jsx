import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../../constants';
import { useFoodOwnership } from '../../hooks/useFoodOwnership';
import OwnerBadge from './OwnerBadge';

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
  const { ownerships, fetchOwnerships, claimOwnership, removeOwnership } = useFoodOwnership();
  const [claiming, setClaiming] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);

  const householdMemberId = parseInt(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID));
  const isOwner = item.id && ownerships.some((o) => o.member_id === householdMemberId);

  useEffect(() => {
    if (item.id) {
      fetchOwnerships(item.id);
    }
  }, [item.id]);

  const shelfLife = useMemo(() => {
    const fk = ['fridge_days_min', 'fridge_days_max', 'freezer_days_min', 'freezer_days_max', 'pantry_days_min', 'pantry_days_max'];
    if (fk.some((k) => item[k] != null)) {
      return {
        fridge: { min: item.fridge_days_min, max: item.fridge_days_max },
        freezer: { min: item.freezer_days_min, max: item.freezer_days_max },
        pantry: { min: item.pantry_days_min, max: item.pantry_days_max },
      };
    }
    return null;
  }, [item]);

  const suggestedExpiryDate = useMemo(() => {
    if (!shelfLife || !storageLocation) return null;
    const locData = shelfLife[storageLocation];
    if (!locData || locData.max == null) return null;
    const d = new Date();
    d.setDate(d.getDate() + locData.max);
    return d.toISOString().split('T')[0];
  }, [shelfLife, storageLocation]);

  const handleClaim = async () => {
    setClaiming(true);
    const success = await claimOwnership(item.id, householdMemberId);
    if (success) fetchOwnerships(item.id);
    setClaiming(false);
  };

  const handleSetAsShared = async () => {
    setUnclaiming(true);
    const success = await removeOwnership(item.id, householdMemberId);
    if (success) fetchOwnerships(item.id);
    setUnclaiming(false);
  };

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
      <div className="mb-3">
        <OwnerBadge ownerNames={item.owner_display_names ?? (item.owner_display_name ? [item.owner_display_name] : [])} />
      </div>
      {shelfLife && (
        <div className="mb-3 space-y-0.5 rounded-lg bg-gray-50 p-2">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        {isOwner && (
          <button
            className="w-full rounded-full border border-amber-300 px-6 py-2 text-center text-sm font-medium text-amber-700 disabled:opacity-50 hover:bg-amber-50"
            disabled={unclaiming}
            onClick={handleSetAsShared}
          >
            {unclaiming ? 'Setting...' : 'Set as shared'}
          </button>
        )}

        {!isOwner && (
          <button
            className="w-full rounded-full border border-emerald-300 px-6 py-2 text-center text-sm font-medium text-emerald-700 disabled:opacity-50 hover:bg-emerald-50"
            disabled={claiming}
            onClick={handleClaim}
          >
            {claiming ? 'Claiming...' : 'Claim as mine'}
          </button>
        )}

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
