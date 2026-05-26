import React, { useState } from 'react';
import axios from 'axios';
import { categories, useSearch } from './useSearch';

const NewFood = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const results = useSearch(search);

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
          <button
            className="mt-2 bg-blue-500 px-4 py-2 text-white"
            onClick={async () => {
              if (selected._source === 'foodkeeper') {
                const body = {
                  foodkeeper_id: selected['ID'].toString(),
                  category: categories[selected['Category_ID']] ?? null,
                  name: selected['Name'],
                  fridge_days_min: selected['Refrigerate_Min'],
                  fridge_days_max: selected['Refrigerate_Max'],
                  freezer_days_min: selected['Freeze_Min'],
                  freezer_days_max: selected['Freeze_Max'],
                  pantry_days_min: selected['Pantry_Min'],
                  pantry_days_max: selected['Pantry_Max'],
                };
                console.log(body);
                await axios.post('/unpackaged-foods', body, {
                  headers: { 'content-type': 'application/json' },
                });
              } else {
                // TODO: axios call for packaged food item
                console.log(selected);
              }
            }}
          >
            Add to fridge
          </button>
        </div>
      )}
    </div>
  );
};

export default NewFood;
