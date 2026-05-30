import { useState, useEffect } from 'react';
import axios from 'axios';

export function useRecentFoods() {
  const [recentFoods, setRecentFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const memberId = parseInt(localStorage.getItem('member_id'));
        const [{ data: inventory }, { data: packaged }, { data: unpackaged }] =
          await Promise.all([
            axios.get('/food-inventory/'),
            axios.get('/packaged-foods/'),
            axios.get('/unpackaged-foods/'),
          ]);

        const packagedById = Object.fromEntries(packaged.map((f) => [f.id, f.name]));
        const unpackagedById = Object.fromEntries(
          unpackaged.map((f) => [f.id, f.name]),
        );

        const filtered = inventory
          .filter((item) => item.added_by_member_id === memberId)
          .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
          .slice(0, 5)
          .map((item) => ({
            ...item,
            _source: item.packaged_food_id ? 'packaged' : 'unpackaged',
            name:
              packagedById[item.packaged_food_id] ??
              unpackagedById[item.unpackaged_food_id] ??
              'Unknown',
          }));

        setRecentFoods(filtered);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, []);

  return { recentFoods, loading, error };
}
