import React, { useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useAddFood } from '../hooks/useAddFood';

const NewFood = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const results = useSearch(search);
  const { addFood, loading, error } = useAddFood();

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
      {!selected && results.length > 0 && (
        <ul className="mt-1 border">
          {results.map((p, i) => (
            <li
              key={i}
              className="cursor-pointer p-1 hover:bg-gray-100"
              onClick={() => setSelected(p)}
            >
              {p._source === 'foodkeeper' ? p.Name : p.product_name}
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div>
          <pre className="mt-1 border p-2 text-xs whitespace-pre-wrap">
            {JSON.stringify(selected, null, 2)}
          </pre>
          <label>Quantity</label>
          <input
            className="border"
            onChange={(e) => {
              setQuantity(e.target.value);
            }}
            value={quantity}
            type="number"
          ></input>
          <button
            className="mt-2 bg-blue-500 px-4 py-2 text-white"
            onClick={() => addFood(selected, quantity)}
          >
            Add to fridge
          </button>
        </div>
      )}
    </div>
  );
};

export default NewFood;
