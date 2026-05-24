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

const SampleData = {
  foodkeeper_id: 'VEG001',
  category: 'Vegetables',
  name: 'Tomato',
  fridge_days_min: 3,
  fridge_days_max: 7,
  freezer_days_min: 30,
  freezer_days_max: 90,
  pantry_days_min: 1,
  pantry_days_max: 3,
  expiry_date: '2026-06-01',
  date_added: '2026-05-23T12:00:00',
  date_updated: '2026-05-23T12:00:00',
};
