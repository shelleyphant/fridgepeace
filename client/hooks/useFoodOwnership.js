import { useState, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';

export function useFoodOwnership() {
  const [ownerships, setOwnerships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOwnerships = useCallback(async (inventoryItemId) => {
    if (!inventoryItemId) {
      setOwnerships([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(
        `${API_URL}/food-ownerships/by-inventory/${inventoryItemId}`,
      );
      setOwnerships(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const claimOwnership = useCallback(async (inventoryItemId, memberId) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/food-ownerships/`, {
        inventory_item_id: inventoryItemId,
        member_id: memberId,
      });
      setOwnerships((prev) => [...prev, data]);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeOwnership = useCallback(async (inventoryItemId, memberId) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/food-ownerships/${inventoryItemId}/${memberId}`);
      setOwnerships((prev) => prev.filter((o) => o.member_id !== memberId));
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { ownerships, loading, error, fetchOwnerships, claimOwnership, removeOwnership };
}
