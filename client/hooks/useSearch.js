import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../constants';

export function useSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) { setResults([]); setLoading(false); return; }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      let local = [];

      try {
        const { data } = await axios.get(`${API_URL}/foods/search`, {
          params: { q: query },
        });

        local = [
          ...data.foodkeeper_results.map((p) => ({ ...p, _source: 'foodkeeper' })),
          ...data.packaged_results.map((p) => ({ ...p, _source: 'packaged' })),
        ];
      } catch (e) {
        console.error('Backend search failed:', e);
      }

      let remote = [];
      try {
        let json;
        if (API_URL) {
          const params = new URLSearchParams({
            q: query,
            countries_tags_en: 'australia',
            sort_by: 'unique_scans_n',
            page_size: '20',
          });
          const res = await window.fetch(`https://world.openfoodfacts.org/api/v2/search?${params}`, {
            headers: { 'User-Agent': 'FridgePeace/1.0 (university project)' },
          });
          json = await res.json();
        } else {
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
          const res = await window.fetch(`/off-proxy/cgi/search.pl?${params}`);
          json = await res.json();
        }
        remote = (json?.products ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
      } catch (e) {
        console.error('OFF search failed:', e);
      }

      if (!cancelled) { setResults([...local, ...remote]); setLoading(false); }
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return { results, loading };
}
