import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const householdId = localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID);

      if (!householdId) {
        setInventory([]);
        return;
      }

      const { data } = await axios.get(`${API_URL}/households/${householdId}/inventory`);

      const items = data.map((item) => ({
        ...item,
        name: item.food_name ?? 'Unknown',
      }));

      setInventory(items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { inventory, loading, error, refresh };
}
