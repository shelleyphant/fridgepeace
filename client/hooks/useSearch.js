import { useState, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const controllerRef = useRef(null);
  const requestIdRef = useRef(0);

  async function search(query) {
    if (!query) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    let local = [];
    try {
      const { data } = await axios.get(`${API_URL}/foods/search`, {
        params: { q: query },
        signal: controller.signal,
      });
      local = [
        ...data.foodkeeper_results.map((p) => ({ ...p, _source: 'foodkeeper' })),
        ...data.packaged_results.map((p) => ({ ...p, _source: 'packaged' })),
      ];
    } catch (e) {
      if (e.name !== 'AbortError' && e.code !== 'ERR_CANCELED') {
        console.error('Backend search failed:', e);
      }
    }

    let remote = [];
    try {
      const params = new URLSearchParams({
        action: 'process',
        search_terms: query,
        tagtype_0: 'countries',
        tag_contains_0: 'contains',
        tag_0: 'Australia',
        sort_by: 'unique_scans_n',
        page_size: '20',
        json: '1',
      });
      const proxyPath = API_URL ? `${API_URL}/off-proxy` : '/off-proxy';
      const res = await window.fetch(`${proxyPath}/cgi/search.pl?${params}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'FridgePeace/1.0 (university project)' },
      });
      if (!res.ok) throw new Error(`OFF proxy returned ${res.status}`);
      const json = await res.json();
      remote = (json?.products ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('OFF search failed:', e);
      }
    }

    if (currentRequestId !== requestIdRef.current) return;
    if (controller.signal.aborted) return;

    setResults([...local, ...remote]);
    setLoading(false);
  }

  function clear() {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setResults([]);
    setHasSearched(false);
    setError(null);
  }

  return { results, loading, error, hasSearched, search, clear };
}
