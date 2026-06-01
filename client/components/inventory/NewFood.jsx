import React, { useState } from 'react';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';

const DISPLAY_NAME = {
  foodkeeper: (p) => p.name,
  packaged: (p) => p.name,
  openfoodfacts: (p) => p.product_name ?? p.name,
};

const NewFood = ({ onSuccess }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { results, loading } = useSearch(search);

  return (
    <div>
      <input
        className="w-full border"
        placeholder="apple"
        onChange={(e) => {
          setSearch(e.target.value);
          setSelected(null);
        }}
        value={search}
      />
      {!selected && loading && (
        <p className="mt-1 text-sm text-gray-500">Searching...</p>
      )}
      {!selected && !loading && results.length > 0 && (
        <ul className="mt-1 border">
          {results.map((p, i) => (
            <li
              key={i}
              className="cursor-pointer p-1 hover:bg-gray-100"
              onClick={() => setSelected(p)}
            >
              {(DISPLAY_NAME[p._source] ?? DISPLAY_NAME.openfoodfacts)(p)}
            </li>
          ))}
        </ul>
      )}
      {selected && <FoodDetail food={selected} onSuccess={onSuccess} />}
    </div>
  );
};

export default NewFood;
