import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export function useMembers(household_id) {
  const [members, setMembers] = useState([]);

  const refresh = useCallback(async () => {
    if (!household_id) return;
    const { data } = await axios.get(`${API}/member/${household_id}/members`);
    setMembers(data);
  }, [household_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { members, refresh };
}
