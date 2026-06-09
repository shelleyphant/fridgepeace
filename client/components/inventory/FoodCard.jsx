import React from 'react';
import moment from 'moment/moment';
import { HugeiconsIcon } from '@hugeicons/react';
import { categoryIcon } from '../../source/categoryIcons';
import {
  Clock01Icon,
  ClockCheckIcon,
  ClockAlertIcon,
  ClockFadingIcon,
} from '@hugeicons/core-free-icons';

const FoodCard = ({ item }) => {
  const Icon = categoryIcon(item.category);

  const expiryDays = moment(item.expiry_date, 'YYYY-MM-DD').diff(moment(), 'days');
  const expiryStyle = () => {
    if (!item.expiry_date) return '';
    switch (true) {
      case expiryDays < 0:
        return { bg: 'bg-red-100', text: 'text-red-700', icon: ClockAlertIcon };
      case expiryDays <= 2:
        return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock01Icon };
      case expiryDays <= 10:
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: ClockFadingIcon };
      default:
        return { bg: 'bg-lime-100', text: 'text-lime-700', icon: ClockCheckIcon };
    }
  };

  return (
    <div className="relative my-6 rounded-4xl bg-white p-6 pt-4">
      <span
        className={`rounded-4xl ${expiryStyle().bg} absolute top-0 left-0 inline-block p-4`}
      >
        <HugeiconsIcon icon={Icon} size={32} />
      </span>

      <span className="text-water-900 mb-6 ml-14 block text-2xl font-bold">
        {item.name}
      </span>
      <span className="rounded-xl bg-indigo-200 px-2 text-xs">{item.added_by}</span>
      {item.storage_location && (
        <span className="rounded-xl bg-green-100 px-2 text-xs capitalize">
          {item.storage_location}
        </span>
      )}
      <span className="block">Quantity: {item.quantity}</span>
      <span>
        {item.expiry_date ? (
          <div className="flex gap-2">
            <HugeiconsIcon
              icon={expiryStyle().icon}
              size={20}
              className={`inline ${expiryStyle().text} `}
            />
            <span className="text-sm">{` Expires ${moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}`}</span>
          </div>
        ) : (
          'No expiry set'
        )}
      </span>
    </div>
  );
};

export default FoodCard;
