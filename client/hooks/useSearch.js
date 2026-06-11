import { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import foodData from '../source/food-data/foodkeeper.json';

const API = process.env.API_URL ?? '';

export const categories = Object.fromEntries(
  (foodData.sheets.find((s) => s.name === 'Category')?.data ?? [])
    .map((row) => Object.assign({}, ...row))
    .filter((r) => r.ID != null)
    .map((r) => [r.ID, `${r.Category_Name} (${r.Subcategory_Name})`]),
);

const products =
  foodData.sheets
    .find((s) => s.name === 'Product')
    ?.data.map((row) => Object.assign({}, ...row)) ?? [];

const fuse = new Fuse(products, {
  keys: ['Name', 'Name_subtitle', 'Keywords'],
  threshold: 0.3,
});

export function useSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      const local = fuse
        .search(query)
        .map(({ item }) => ({ ...item, _source: 'foodkeeper' }));

      let remote = [];
      try {
        const params = new URLSearchParams({ q: query, page_size: '20' });
        const res = await window.fetch(`${API}/off-products-au/search?${params}`);
        const json = await res.json();
        remote = (json?.items ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
      } catch (e) {
        console.error('OFF search failed:', e);
      }

      if (!cancelled) {
        setResults([...local, ...remote]);
        setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
}
