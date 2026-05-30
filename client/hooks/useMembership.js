import { useState } from 'react';
import axios from 'axios';

export function useMembership() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function addMembership(username) {
    setLoading(true);
    setError(null);

    try {
      const result = await axios.post('/users/', { username, display_name: username });
      localStorage.setItem('member_id', String(result.data.id));
      return true;
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function setMembership(username) {
    setLoading(true);
    setError(null);

    try {
      const result = await axios.get('/users/', { params: { username } });
      localStorage.setItem('member_id', String(result.data.id));
      return true;
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { addMembership, setMembership, loading, error };
}
