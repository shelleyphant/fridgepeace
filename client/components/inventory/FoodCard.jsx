import React from 'react';
import moment from 'moment/moment';
import { HugeiconsIcon } from '@hugeicons/react';
import { categoryIcon } from '../../source/categoryIcons';

const FoodCard = ({ item }) => {
  const Icon = categoryIcon(item.category);

  return (
    <div className="relative my-6 rounded-4xl bg-white p-6 pt-4">
      <span className="absolute top-0 left-0 inline-block rounded-4xl bg-amber-200 p-4">
        <HugeiconsIcon icon={Icon} size={32} />
      </span>

      <span className="mb-6 ml-14 block text-2xl font-bold">{item.name}</span>
      <span className="rounded-xl bg-indigo-200 px-2 text-xs">{item.added_by}</span>
      <span className="block">Quantity: {item.quantity}</span>
      <span className="block">
        {item.expiry_date
          ? `Expires ${moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}`
          : 'No expiry set'}
      </span>
    </div>
  );
};

export default FoodCard;
