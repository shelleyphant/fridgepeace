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
      const memberId = parseInt(localStorage.getItem('member_id'));
      const [{ data: inv }, { data: packaged }, { data: unpackaged }, { data: members }] = await Promise.all([
        axios.get(`${API}/food-inventory/`),
        axios.get(`${API}/packaged-foods/`),
        axios.get(`${API}/unpackaged-foods/`),
        axios.get(`${API}/household-members/`),
      ]);

      const packagedById = Object.fromEntries(packaged.map((f) => [f.id, f]));
      const unpackagedById = Object.fromEntries(unpackaged.map((f) => [f.id, f]));
      const memberById = Object.fromEntries(members.map((m) => [m.id, m.display_name]));

      const items = inv
        .filter((item) => item.added_by_member_id === memberId)
        .map((item) => {
          const food = packagedById[item.packaged_food_id] ?? unpackagedById[item.unpackaged_food_id];
          return {
            ...item,
            name: food?.name ?? 'Unknown',
            category: food?.category ?? null,
            added_by: memberById[item.added_by_member_id] ?? null,
          };
        });

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
