import React, { useState } from 'react';
import moment from 'moment/moment';
import { useDeleteFood } from '../../hooks/useDeleteFood';
import OwnerBadge from './OwnerBadge';

const STORAGE_LABEL = {
  fridge: '🧊 Fridge',
  freezer: '❄️ Freezer',
  pantry: '📦 Pantry',
};

const getExpiryStatus = (date) => {
  if (!date) return 'none';
  const days = moment(date, 'YYYY-MM-DD').diff(moment(), 'days');
  if (days < 0) return 'expired';
  if (days <= 2) return 'critical';
  if (days <= 7) return 'warning';
  return 'ok';
};

const STATUS_STYLE = {
  expired: 'border-l-red-500 bg-red-50',
  critical: 'border-l-red-400',
  warning: 'border-l-yellow-400',
  ok: 'border-l-green-400',
  none: 'border-l-gray-200',
};

const FoodCard = ({ item, onDelete, onEdit }) => {
  const [confirming, setConfirming] = useState(false);
  const { deleteFood, loading } = useDeleteFood();

  const storage = STORAGE_LABEL[item.storage_location] ?? item.storage_location ?? null;
  const quantity = item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : null;
  const hasExpiry = !!item.expiry_date;
  const expiryStatus = getExpiryStatus(item.expiry_date);

  const handleDelete = async () => {
    const success = await deleteFood(item.id);
    if (success) onDelete?.(item.id);
    setConfirming(false);
  };

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm mt-3 border-l-4 ${STATUS_STYLE[expiryStatus]}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="block text-xl font-bold">{item.name}</span>
          {item.food_brand && (
            <span className="block text-sm text-gray-500">{item.food_brand}</span>
          )}
          <div className="mt-1">
            <OwnerBadge ownerName={item.owner_display_name} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quantity && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
              {quantity}
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
        {storage && <span>{storage}</span>}
        {hasExpiry && (
          <span className={expiryStatus === 'expired' ? 'text-red-600 font-medium' : ''}>
            {moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}
          </span>
        )}
        {!hasExpiry && <span>No expiry set</span>}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="rounded-full bg-gray-100 px-4 py-1 text-center text-xs text-gray-600 hover:bg-gray-200"
          onClick={() => onEdit?.(item)}
        >
          Edit
        </button>
        {!confirming ? (
          <button
            className="rounded-full bg-red-500 px-4 py-1 text-center text-xs text-white hover:bg-red-600"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              className="rounded-full bg-red-500 px-3 py-1 text-center text-xs text-white disabled:opacity-50"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? '...' : 'Confirm'}
            </button>
            <button
              className="rounded-full bg-gray-100 px-3 py-1 text-center text-xs text-gray-600 hover:bg-gray-200"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodCard;
