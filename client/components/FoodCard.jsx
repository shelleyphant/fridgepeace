import React from 'react';
import moment from 'moment/moment';

const FoodCard = () => {
  return (
    <div className="rounded-4xl bg-white p-6">
      <span className="block text-2xl font-bold">{SampleData.name}</span>
      <span className="block">
        Expires in {moment(SampleData.expiry_date, 'YYYY-MM-DD').fromNow()}
      </span>
    </div>
  );
};

export default FoodCard;

// Intention to use GET /food-inventory/{food_id}
const SampleData = {
  id: 1,
  household_id: 1,
  added_by_member_id: 1,
  packaged_food_id: 1,
  unpackaged_food_id: null,
  category: 'Vegetables',
  name: 'Tomato',
  brand: null,
  storage_location: 'fridge',
  quantity: '2.50',
  unit: 'L',
  expiry_date: '2026-06-01',
  date_added: '2026-05-23T12:00:00',
  date_updated: '2026-05-23T12:00:00',
};
