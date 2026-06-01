import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';

export function useDeleteFood() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function deleteFood(itemId) {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/food-inventory/${itemId}`);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { deleteFood, loading, error };
}
