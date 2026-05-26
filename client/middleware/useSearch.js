import { useState, useEffect } from 'react';
import foodData from '../source/food-data/foodkeeper.json';
import { OpenFoodFacts } from '@openfoodfacts/openfoodfacts-nodejs';

const proxyFetch = (url, options) => {
  const urlString = url instanceof Request ? url.url : url instanceof URL ? url.href : String(url);
  return window.fetch(urlString.replace('https://world.openfoodfacts.org', '/off-proxy'), options);
};

const offClient = new OpenFoodFacts(proxyFetch);

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

    (async () => {
      const local = products
        .filter((p) => p.Name?.toLowerCase().includes(query.toLowerCase()))
        .map((p) => ({ ...p, _source: 'foodkeeper' }));

      let remote = [];
      try {
        const { data, error } = await offClient.search({ q: query, page_size: 10 });
        if (error) console.error('OFF error:', error);
        else remote = (data?.products ?? []).map((p) => ({ ...p, _source: 'openfoodfacts' }));
      } catch (e) {
        console.error('OFF search failed:', e);
      }

      if (!cancelled) setResults([...local, ...remote]);
    })();

    return () => { cancelled = true; };
  }, [query]);

  return results;
}
