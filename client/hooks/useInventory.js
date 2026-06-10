import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const householdId = localStorage.getItem('household_id');
      const [
        { data: inv },
        { data: packaged },
        { data: unpackaged },
        { data: members },
      ] = await Promise.all([
        axios.get(`${API}/food-inventory/?household_id=${householdId}`),
        axios.get(`${API}/packaged-foods/`),
        axios.get(`${API}/unpackaged-foods/`),
        axios.get(`${API}/member/${householdId}/members`),
      ]);

      const packagedById = Object.fromEntries(packaged.map((f) => [f.id, f]));
      const unpackagedById = Object.fromEntries(unpackaged.map((f) => [f.id, f]));
      const memberById = Object.fromEntries(members.map((m) => [m.id, m.display_name]));

      const ownerships = await Promise.all(
        inv.map(({ id }) =>
          axios.get(`${API}/food-ownerships/by-inventory/${id}`).then((r) => r.data),
        ),
      );

      const items = inv.map((item, i) => {
        const food =
          packagedById[item.packaged_food_id] ??
          unpackagedById[item.unpackaged_food_id];
        return {
          ...item,
          name: food?.name ?? 'Unknown',
          category: food?.category ?? null,
          owners: ownerships[i].map((o) => memberById[o.member_id] ?? 'Unknown'),
        };
      });

      setInventory(items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { inventory, loading, error, refresh };
}
