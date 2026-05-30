import { useState } from 'react';
import axios from 'axios';

export function useHousehold() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addHousehold(housename) {
    setLoading(true);
    setError(null);

    try {
      const result = await axios.post('/household/', { params: { housename } });
      localStorage.setItem('household_id', String(result.data.id));
      return true;
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }
  async function setHousehold(username) {
    setLoading(true);
    setError(null);
  }

  return { addHousehold, setHousehold, loading, error };
}
