import { useState, useEffect } from 'react';
import foodData from '../source/food-data/foodkeeper.json';

async function login() {
  const body = new URLSearchParams({
    user_id: process.env.OFF_USER,
    password: process.env.OFF_PASSWORD,
    action: 'process',
  });
  const res = await window.fetch('/off-proxy/cgi/session.pl', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) console.error('OFF login failed:', res.status);
}

login();

export const categories = Object.fromEntries(
  (foodData.sheets.find((s) => s.name === 'Category')?.data ?? [])
    .map((row) => Object.assign({}, ...row))
    .filter((r) => r.Category_ID != null)
    .map((r) => [r.Category_ID, r.Category_Name]),
);

const products =
  foodData.sheets
    .find((s) => s.name === 'Product')
    ?.data.map((row) => Object.assign({}, ...row)) ?? [];

export function useSearch(query) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) { setResults([]); return; }

    let cancelled = false;

    const timer = setTimeout(async () => {
      const local = products
        .filter((p) => p.Name?.toLowerCase().includes(query.toLowerCase()))
        .map((p) => ({ ...p, _source: 'foodkeeper' }));

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
        const res = await window.fetch(`/off-proxy/cgi/search.pl?${params}`, { credentials: 'include' });
        const json = await res.json();
        remote = (json?.products ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
      } catch (e) {
        console.error('OFF search failed:', e);
      }

      if (!cancelled) setResults([...local, ...remote]);
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  return results;
}
