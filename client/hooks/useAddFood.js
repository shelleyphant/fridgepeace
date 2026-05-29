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
        const body = {
          foodkeeper_id: selected['ID'].toString(),
          category: categories[selected['Category_ID']] ?? null,
          name: selected['Name'],
          fridge_days_min: selected['Refrigerate_Min'],
          fridge_days_max: selected['Refrigerate_Max'],
          freezer_days_min: selected['Freeze_Min'],
          freezer_days_max: selected['Freeze_Max'],
          pantry_days_min: selected['Pantry_Min'],
          pantry_days_max: selected['Pantry_Max'],
        };
        await axios.post('/unpackaged-foods', body, {
          headers: { 'content-type': 'application/json' },
        });
      } else {
        // TODO: packaged food
        console.log(selected);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  return { addFood, loading, error };
}
