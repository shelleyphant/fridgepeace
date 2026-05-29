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
        const [packaged, unpackaged] = await Promise.all([
          axios.get('/packaged-foods/'),
          axios.get('/unpackaged-foods/'),
        ]);

        const p = packaged.data
          .sort((a, b) => b.id - a.id)
          .slice(0, 3)
          .map((f) => ({ ...f, _source: 'packaged' }));

        const u = unpackaged.data
          .sort((a, b) => b.id - a.id)
          .slice(0, 3)
          .map((f) => ({ ...f, _source: 'unpackaged' }));

        setRecentFoods([...p, ...u]);
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
