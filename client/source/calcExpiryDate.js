import moment from 'moment';

const toDays = (value, metric) => {
  if (value == null || metric == null) return null;
  switch (metric.toLowerCase()) {
    case 'weeks':
      return value * 7;
    case 'months':
      return value * 30;
    case 'years':
      return value * 365;
    default:
      return value;
  }
};

const pantryFields = [
  ['Pantry_Max', 'Pantry_Metric'],
  ['DOP_Pantry_Max', 'DOP_Pantry_Metric'],
  ['Pantry_After_Opening_Max', 'Pantry_After_Opening_Metric'],
];
const fridgeFields = [
  ['Refrigerate_Max', 'Refrigerate_Metric'],
  ['DOP_Refrigerate_Max', 'DOP_Refrigerate_Metric'],
  ['Refrigerate_After_Opening_Max', 'Refrigerate_After_Opening_Metric'],
];
const freezerFields = [
  ['Freeze_Max', 'Freeze_Metric'],
  ['DOP_Freeze_Max', 'DOP_Freeze_Metric'],
];
const fieldsByLocation = {
  fridge: fridgeFields,
  freezer: freezerFields,
  pantry: pantryFields,
  counter: pantryFields,
};

export const calcExpiryDate = (food, storageLocation, date) => {
  if (food._source === 'unpackaged') {
    const storedDaysByLocation = {
      fridge: food.fridge_days_max,
      freezer: food.freezer_days_max,
      pantry: food.pantry_days_max,
      counter: food.pantry_days_max,
    };
    const days = storedDaysByLocation[storageLocation];
    if (!days) return date;
    return moment(date).add(days, 'days').format('YYYY-MM-DD');
  }
  if (food._source !== 'foodkeeper' || food.packaged_food_id) return date;

  const fields = fieldsByLocation[storageLocation] ?? [
    ...pantryFields,
    ...fridgeFields,
    ...freezerFields,
  ];
  const maxDays = Math.max(
    ...fields
      .map(([maxKey, metricKey]) => toDays(food[maxKey], food[metricKey]))
      .filter((v) => v != null),
  );
  if (!isFinite(maxDays)) return date;
  return moment(date).add(maxDays, 'days').format('YYYY-MM-DD');
};
