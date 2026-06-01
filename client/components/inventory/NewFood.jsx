import React, { useState } from 'react';
import { Loading02Icon } from '@hugeicons/core-free-icons';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';
import { HugeiconsIcon } from '@hugeicons/react';

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
      {loading && <HugeiconsIcon icon={Loading02Icon} className="animate-spin" />}
      {!selected && !loading && results.length > 0 && (
        <ul className="mt-1 border">
          {results.map((p, i) => (
            <li
              key={i}
              className="cursor-pointer p-1 hover:bg-gray-100"
              onClick={() => setSelected(p)}
            >
              {p._source === 'foodkeeper'
                ? `${p.Name} (${p.Name_subtitle}) `
                : `${p.product_name} (${p.brands})`}
            </li>
          ))}
        </ul>
      )}
      {selected && <FoodDetail food={selected} onSuccess={onSuccess} />}
    </div>
  );
};

export default NewFood;
