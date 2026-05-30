import { useState } from 'react';
import axios from 'axios';
import { categories } from './useSearch';

export function useAddFood() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addFood(selected, inventoryDetails) {
    setLoading(true);
    setError(null);
    try {
      let packaged_food_id = null;
      let unpackaged_food_id = null;

      if (selected._source === 'packaged') {
        packaged_food_id = selected.packaged_food_id;
      } else if (selected._source === 'unpackaged') {
        unpackaged_food_id = selected.unpackaged_food_id;
      } else if (selected._source === 'foodkeeper') {
        const { data: existing } = await axios.get('/unpackaged-foods/');
        const match = existing.find((f) => f.foodkeeper_id === selected.ID?.toString());
        if (match) {
          unpackaged_food_id = match.id;
        } else {
          const { data: created } = await axios.post(
            '/unpackaged-foods/',
            {
              foodkeeper_id: selected.ID?.toString() ?? null,
              category: categories[selected.Category_ID] ?? null,
              name: selected.Name,
              fridge_days_min: selected.Refrigerate_Min ?? null,
              fridge_days_max: selected.Refrigerate_Max ?? null,
              freezer_days_min: selected.Freeze_Min ?? null,
              freezer_days_max: selected.Freeze_Max ?? null,
              pantry_days_min: selected.Pantry_Min ?? null,
              pantry_days_max: selected.Pantry_Max ?? null,
            },
            { headers: { 'content-type': 'application/json' } },
          );
          unpackaged_food_id = created.id;
        }
      } else {
        const { data: existing } = await axios.get('/packaged-foods/');
        const match = existing.find((f) => f.barcode === selected.code);
        if (match) {
          packaged_food_id = match.id;
        } else {
          const { data: created } = await axios.post(
            '/packaged-foods/',
            {
              barcode: selected.code ?? null,
              name: selected.product_name,
              brand: selected.brands ?? null,
              image_url: selected.image_front_url ?? null,
              category: selected.categories ?? null,
              nutrition: selected.nutriments
                ? JSON.stringify(selected.nutriments)
                : null,
            },
            { headers: { 'content-type': 'application/json' } },
          );
          packaged_food_id = created.id;
        }
      }

      const household_id = localStorage.getItem('household_id');
      const added_by_member_id = parseInt(localStorage.getItem('member_id'));

      await axios.post(
        '/food-inventory/',
        {
          packaged_food_id,
          unpackaged_food_id,
          household_id,
          added_by_member_id,
          quantity: inventoryDetails.quantity,
          unit: inventoryDetails.unit ?? 'item', // TBC
          storage_location: inventoryDetails.storage_location ?? null,
          expiry_date: inventoryDetails.expiry_date ?? null,
        },
        { headers: { 'content-type': 'application/json' } },
      );

      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateFood(inventoryItem, additionalQuantity) {
    setLoading(true);
    setError(null);
    try {
      const newQuantity =
        parseFloat(inventoryItem.quantity) + parseFloat(additionalQuantity);
      await axios.put(
        `/food-inventory/${inventoryItem.id}`,
        {
          household_id: inventoryItem.household_id,
          added_by_member_id: inventoryItem.added_by_member_id,
          packaged_food_id: inventoryItem.packaged_food_id,
          unpackaged_food_id: inventoryItem.unpackaged_food_id,
          storage_location: inventoryItem.storage_location,
          quantity: newQuantity,
          unit: inventoryItem.unit,
          expiry_date: inventoryItem.expiry_date,
        },
        { headers: { 'content-type': 'application/json' } },
      );
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { addFood, updateFood, loading, error };
}
