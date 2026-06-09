import { useState } from 'react';
import axios from 'axios';
import { categories } from './useSearch';

const API = process.env.API_URL ?? '';

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
        const { data: existing } = await axios.get(`${API}/unpackaged-foods/`);
        const match = existing.find((f) => f.foodkeeper_id === selected.ID?.toString());
        if (match) {
          unpackaged_food_id = match.id;
        } else {
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
          const maxDays = (value, metric, dopValue, dopMetric) =>
            Math.max(
              ...[toDays(value, metric), toDays(dopValue, dopMetric)].filter(
                (v) => v != null,
              ),
            ) || null;
          const { data: created } = await axios.post(
            `${API}/unpackaged-foods/`,
            {
              foodkeeper_id: selected.ID?.toString() ?? null,
              category: categories[selected.Category_ID] ?? null,
              name: selected.Name,
              fridge_days_min:
                toDays(selected.Refrigerate_Min, selected.Refrigerate_Metric) ??
                toDays(selected.DOP_Refrigerate_Min, selected.DOP_Refrigerate_Metric) ??
                null,
              fridge_days_max: maxDays(
                selected.Refrigerate_Max,
                selected.Refrigerate_Metric,
                selected.DOP_Refrigerate_Max,
                selected.DOP_Refrigerate_Metric,
              ),
              freezer_days_min:
                toDays(selected.Freeze_Min, selected.Freeze_Metric) ??
                toDays(selected.DOP_Freeze_Min, selected.DOP_Freeze_Metric) ??
                null,
              freezer_days_max: maxDays(
                selected.Freeze_Max,
                selected.Freeze_Metric,
                selected.DOP_Freeze_Max,
                selected.DOP_Freeze_Metric,
              ),
              pantry_days_min:
                toDays(selected.Pantry_Min, selected.Pantry_Metric) ??
                toDays(selected.DOP_Pantry_Min, selected.DOP_Pantry_Metric) ??
                null,
              pantry_days_max: maxDays(
                selected.Pantry_Max,
                selected.Pantry_Metric,
                selected.DOP_Pantry_Max,
                selected.DOP_Pantry_Metric,
              ),
            },
            { headers: { 'content-type': 'application/json' } },
          );
          unpackaged_food_id = created.id;
        }
      } else {
        const { data: existing } = await axios.get(`${API}/packaged-foods/`);
        const match = existing.find((f) => f.barcode === selected.code);
        if (match) {
          packaged_food_id = match.id;
        } else {
          const { data: created } = await axios.post(
            `${API}/packaged-foods/`,
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
        `${API}/food-inventory/`,
        {
          packaged_food_id,
          unpackaged_food_id,
          household_id,
          added_by_member_id,
          quantity: inventoryDetails.quantity,
          unit: inventoryDetails.unit ?? 'item',
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

  async function updateFood(
    inventoryItem,
    additionalQuantity,
    expiry_date,
    storage_location,
  ) {
    setLoading(true);
    setError(null);
    try {
      const newQuantity =
        parseFloat(inventoryItem.quantity) + parseFloat(additionalQuantity);
      await axios.put(
        `${API}/food-inventory/${inventoryItem.id}`,
        {
          household_id: inventoryItem.household_id,
          added_by_member_id: inventoryItem.added_by_member_id,
          packaged_food_id: inventoryItem.packaged_food_id,
          unpackaged_food_id: inventoryItem.unpackaged_food_id,
          storage_location: storage_location ?? inventoryItem.storage_location,
          quantity: newQuantity,
          unit: inventoryItem.unit,
          expiry_date: expiry_date ?? inventoryItem.expiry_date,
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
