import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';

export function useFoodEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (inventoryItemId) => {
    if (!inventoryItemId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(
        `${API_URL}/food-events/by-inventory/${inventoryItemId}/with-members`,
      );
      setEvents(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents };
}
