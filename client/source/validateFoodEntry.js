const locationMaxFields = {
  fridge: ['Refrigerate_Max', 'DOP_Refrigerate_Max', 'Refrigerate_After_Opening_Max'],
  freezer: ['Freeze_Max', 'DOP_Freeze_Max'],
  pantry: ['Pantry_Max', 'DOP_Pantry_Max', 'Pantry_After_Opening_Max'],
  counter: ['Pantry_Max', 'DOP_Pantry_Max', 'Pantry_After_Opening_Max'],
};

export const validateFoodEntry = (food, { quantity, date, storageLocation }) => {
  const missingQuantity = !quantity || isNaN(quantity) || Number(quantity) <= 0;
  const missingDate = !date;
  const missingLocation = !storageLocation;
  if (missingQuantity && missingDate) return 'Quantity and date are required';
  if (missingQuantity) return 'Please enter a valid quantity';
  if (missingDate) return 'Please enter a date';
  if (missingLocation) return 'Please select a storage location';
  if (
    food._source === 'foodkeeper' &&
    !food.packaged_food_id &&
    locationMaxFields[storageLocation]?.every((f) => food[f] == null)
  )
    return 'Unsuitable storage location';
  if (food._source === 'unpackaged') {
    const storedDays = {
      fridge: food.fridge_days_max,
      freezer: food.freezer_days_max,
      pantry: food.pantry_days_max,
      counter: food.pantry_days_max,
    };
    if (storedDays[storageLocation] == null) return 'Unsuitable storage location';
  }
  return null;
};
