import React from 'react';
import moment from 'moment/moment';

const STORAGE_LABEL = {
  fridge: '🧊 Fridge',
  freezer: '❄️ Freezer',
  pantry: '📦 Pantry',
};

const FoodCard = ({ item }) => {
  const storage = STORAGE_LABEL[item.storage_location] ?? item.storage_location ?? null;
  const quantity = item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : null;
  const hasExpiry = !!item.expiry_date;

  return (
    <div className="rounded-4xl bg-white p-4 shadow-sm mt-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="block text-xl font-bold">{item.name}</span>
          {item.food_brand && (
            <span className="block text-sm text-gray-500">{item.food_brand}</span>
          )}
        </div>
        {quantity && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
            {quantity}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
        {storage && <span>{storage}</span>}
        {hasExpiry && (
          <span>
            {moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}
          </span>
        )}
        {!hasExpiry && <span>No expiry set</span>}
      </div>
    </div>
  );
};

export default FoodCard;
