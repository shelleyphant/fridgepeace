import React from 'react';
import moment from 'moment/moment';
import { HugeiconsIcon } from '@hugeicons/react';
import { categoryIcon } from '../../source/categoryIcons';

const FoodCard = ({ item }) => {
  const Icon = categoryIcon(item.category);

  const expiryColor = () => {
    if (!item.expiry_date) return '';
    const days = moment(item.expiry_date, 'YYYY-MM-DD').diff(moment(), 'days');
    switch (true) {
      case days < 0:
        return 'bg-red-200';
      case days <= 2:
        return 'bg-orange-200';
      case days <= 10:
        return 'bg-amber-200';
      default:
        return 'bg-lime-200';
    }
  };

  return (
    <div className="relative my-6 rounded-4xl bg-white p-6 pt-4">
      <span
        className={`rounded-4xl ${expiryColor()} absolute top-0 left-0 inline-block p-4`}
      >
        <HugeiconsIcon icon={Icon} size={32} />
      </span>

      <span className="mb-6 ml-14 block text-2xl font-bold">{item.name}</span>
      <span className="rounded-xl bg-indigo-200 px-2 text-xs">{item.added_by}</span>
      {item.storage_location && (
        <span className="rounded-xl bg-green-100 px-2 text-xs capitalize">
          {item.storage_location}
        </span>
      )}
      <span className="block">Quantity: {item.quantity}</span>
      <span className={`inline-block rounded-xl px-2 text-xs`}>
        {item.expiry_date
          ? `Expires ${moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}`
          : 'No expiry set'}
      </span>
    </div>
  );
};

export default FoodCard;
