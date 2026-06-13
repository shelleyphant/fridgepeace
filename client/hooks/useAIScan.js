import { useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export function useAIScan() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scan = useCallback(async (image1, image2) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image_1', image1);

      if (image2) {
        formData.append('image_2', image2);
      }

      const { data } = await axios.post(`${API}/ai-scan/combined`, formData, {
        headers: { 'content-type': 'multipart/form-data' },
      });

      setResult(data);
      return data;
    } catch (e) {
      const msg = e?.response?.data?.detail ?? e.message ?? 'Scan failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
    setError(null);
  }, []);

  return { scan, result, loading, error, reset };
}
