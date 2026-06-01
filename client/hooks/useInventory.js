import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const householdId = localStorage.getItem('household_id');
      const memberId = parseInt(localStorage.getItem('household_member_id'));

      if (!householdId) {
        setInventory([]);
        return;
      }

      const { data } = await axios.get(`${API}/households/${householdId}/inventory`);

      const items = data
        .filter((item) => item.added_by_member_id === memberId)
        .map((item) => ({
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
