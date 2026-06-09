import { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import foodData from '../source/food-data/foodkeeper.json';

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
        let json;
        if (process.env.API_URL) {
          const params = new URLSearchParams({
            q: query,
            countries_tags_en: 'australia',
            sort_by: 'unique_scans_n',
            page_size: '20',
          });
          const res = await window.fetch(
            `https://world.openfoodfacts.org/api/v2/search?${params}`,
            {
              headers: { 'User-Agent': 'FridgePeace/1.0 (university project)' },
            },
          );
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
        const fetched = (json?.products ?? []).map((p) => ({
          ...p,
          _source: 'openfoodfacts',
        }));
        remote = new Fuse(fetched, { keys: ['product_name', 'brands'], threshold: 0.3 })
          .search(query)
          .map(({ item }) => item);
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
