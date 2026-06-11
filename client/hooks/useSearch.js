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
  includeScore: true,
});

const PAGE_SIZE = 10;

export function useSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);

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
        .map(({ item, score }) => ({ ...item, _source: 'foodkeeper', _score: score }));

      let remote = [];
      try {
        const params = new URLSearchParams({ q: query, page_size: '20' });
        const res = await window.fetch(`${API}/off-products-au/search?${params}`);
        const json = await res.json();
        const fetched = (json?.items ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
        remote = new Fuse(fetched, {
          keys: ['product_name', 'brands'],
          threshold: 0.3,
          includeScore: true,
        })
          .search(query)
          .map(({ item, score }) => ({ ...item, _score: score }));
      } catch (e) {
        console.error('OFF search failed:', e);
      }

      if (!cancelled) {
        const combined = [...local, ...remote]
          .sort((a, b) => a._score - b._score)
          .map(({ _score, ...item }) => item);
        setResults(combined);
        setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const loadMore = () => setVisibleCount((c) => c + PAGE_SIZE);

  return {
    results: results.slice(0, visibleCount),
    loading,
    loadMore,
    hasMore: visibleCount < results.length,
  };
}
