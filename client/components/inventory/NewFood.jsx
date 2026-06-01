import React, { useState } from 'react';
import axios from 'axios';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';

const API = process.env.API_URL ?? '';

const DISPLAY_NAME = {
  foodkeeper: (p) => p.name,
  packaged: (p) => p.name,
  openfoodfacts: (p) => p.product_name ?? p.name,
};

const SOURCE_BADGE = {
  foodkeeper: {
    label: 'FoodKeeper',
    class: 'bg-green-100 text-green-800',
  },
  packaged: {
    label: 'Packaged',
    class: 'bg-purple-100 text-purple-800',
  },
  openfoodfacts: {
    label: 'OpenFoodFacts',
    class: 'bg-orange-100 text-orange-800',
  },
};

const BARCODE_LENGTHS = [8, 12, 13];

const isBarcode = (text) => BARCODE_LENGTHS.includes(text.length) && /^\d+$/.test(text);

const NewFood = ({ onSuccess }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState(null);
  const { results, loading } = useSearch(isBarcode(search) ? '' : search);

  const handleSearch = (value) => {
    setSearch(value);
    setSelected(null);
    setBarcodeError(null);
    if (isBarcode(value)) {
      setBarcodeLoading(true);
      axios.get(`${API}/foods/search?q=${encodeURIComponent(value)}&source=barcode`)
        .then((res) => {
          const items = res.data.results ?? res.data;
          if (items.length > 0) {
            setSelected(items[0]);
          } else {
            axios.get(`/off-proxy/api/v0/product/${value}.json`)
              .then((offRes) => {
                const product = offRes.data?.product;
                if (product) {
                  setSelected({
                    _source: 'openfoodfacts',
                    name: product.product_name,
                    food_name: product.product_name,
                    food_brand: product.brands,
                    food_category: product.categories_tags?.[0],
                  });
                } else {
                  setBarcodeError('No product found for this barcode.');
                }
              })
              .catch(() => setBarcodeError('Barcode lookup failed.'))
              .finally(() => setBarcodeLoading(false));
          }
        })
        .catch(() => {
          axios.get(`/off-proxy/api/v0/product/${value}.json`)
            .then((offRes) => {
              const product = offRes.data?.product;
              if (product) {
                setSelected({
                  _source: 'openfoodfacts',
                  name: product.product_name,
                  food_name: product.product_name,
                  food_brand: product.brands,
                  food_category: product.categories_tags?.[0],
                });
              } else {
                setBarcodeError('No product found for this barcode.');
              }
            })
            .catch(() => setBarcodeError('Barcode lookup failed.'))
            .finally(() => setBarcodeLoading(false));
        });
    }
  };

  return (
    <div>
      <input
        className="w-full border"
        placeholder="Search food name or scan barcode"
        onChange={(e) => handleSearch(e.target.value)}
        value={search}
      />
      {barcodeLoading && (
        <p className="mt-1 text-sm text-blue-500">Looking up barcode...</p>
      )}
      {barcodeError && (
        <p className="mt-1 text-sm text-red-500">{barcodeError}</p>
      )}
      {!selected && !barcodeLoading && loading && (
        <p className="mt-1 text-sm text-gray-500">Searching...</p>
      )}
      {!selected && !barcodeLoading && !loading && results.length > 0 && (
        <ul className="mt-1 border">
          {results.map((p, i) => {
            const badge = SOURCE_BADGE[p._source] ?? SOURCE_BADGE.openfoodfacts;
            return (
              <li
                key={i}
                className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-100 border-b last:border-b-0"
                onClick={() => setSelected(p)}
              >
                <span>{(DISPLAY_NAME[p._source] ?? DISPLAY_NAME.openfoodfacts)(p)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.class}`}>
                  {badge.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {selected && <FoodDetail food={selected} onSuccess={onSuccess} />}
    </div>
  );
};

export default NewFood;
