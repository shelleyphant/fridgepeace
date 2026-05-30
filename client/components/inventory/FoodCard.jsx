import React from 'react';
import moment from 'moment/moment';

const FoodCard = ({ item }) => {
  return (
    <div className="rounded-4xl bg-white p-6">
      <span className="block text-2xl font-bold">{item.name}</span>
      <span className="block">
        {item.expiry_date
          ? `Expires ${moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}`
          : 'No expiry set'}
      </span>
    </div>
  );
};

export default FoodCard;
