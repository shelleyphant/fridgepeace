import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export function useNotifications() {
  const userId = localStorage.getItem('member_id');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const { data } = await axios.get(`${API}/users/${userId}/notifications`);
      setNotifications(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId) return;
      await axios.patch(`${API}/users/${userId}/notifications/${notificationId}/read`);
      await refresh();
    },
    [userId, refresh],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await axios.patch(`${API}/users/${userId}/notifications/read-all`);
    await refresh();
  }, [userId, refresh]);

  return { notifications, loading, error, refresh, markAsRead, markAllAsRead };
}
