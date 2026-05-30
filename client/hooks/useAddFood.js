import { useState } from 'react';
import axios from 'axios';
import { categories } from './useSearch';

export function useAddFood() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addFood(selected, quantity) {
    setLoading(true);
    setError(null);
    try {
      if (selected._source === 'foodkeeper') {
        await axios.post('/unpackaged-foods', {
          foodkeeper_id: selected.ID?.toString() ?? null,
          category: categories[selected.Category_ID] ?? null,
          name: selected.Name,
          fridge_days_min: selected.Refrigerate_Min ?? null,
          fridge_days_max: selected.Refrigerate_Max ?? null,
          freezer_days_min: selected.Freeze_Min ?? null,
          freezer_days_max: selected.Freeze_Max ?? null,
          pantry_days_min: selected.Pantry_Min ?? null,
          pantry_days_max: selected.Pantry_Max ?? null,
        }, { headers: { 'content-type': 'application/json' } });
      } else {
        await axios.post('/packaged-foods', {
          barcode: selected.code ?? null,
          name: selected.product_name,
          brand: selected.brands ?? null,
          image_url: selected.image_front_url ?? null,
          category: selected.categories ?? null,
          nutrition: selected.nutriments ? JSON.stringify(selected.nutriments) : null,
        }, { headers: { 'content-type': 'application/json' } });
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  return { addFood, loading, error };
}
