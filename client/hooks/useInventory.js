import { useState, useEffect } from 'react';
import axios from 'axios';

export function useInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const memberId = parseInt(localStorage.getItem('member_id'));
        const [{ data: inv }, { data: packaged }, { data: unpackaged }] = await Promise.all([
          axios.get('/food-inventory/'),
          axios.get('/packaged-foods/'),
          axios.get('/unpackaged-foods/'),
        ]);

        const packagedById = Object.fromEntries(packaged.map((f) => [f.id, f.name]));
        const unpackagedById = Object.fromEntries(unpackaged.map((f) => [f.id, f.name]));

        const items = inv
          .filter((item) => item.added_by_member_id === memberId)
          .map((item) => ({
            ...item,
            name: packagedById[item.packaged_food_id] ?? unpackagedById[item.unpackaged_food_id] ?? 'Unknown',
          }));

        setInventory(items);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  return { inventory, loading, error };
}
