import React, { useState } from 'react';
import foodData from '../../foodkeeper.json';
import axios from 'axios';

const products =
  foodData.sheets
    .find((s) => s.name === 'Product')
    ?.data.map((row) => Object.assign({}, ...row)) ?? [];

const NewFood = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const results = search
    ? products.filter((p) => p.Name?.toLowerCase().includes(search.toLowerCase()))
    : [];

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
              {p.Name}
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div>
          <pre className="mt-1 border p-2 text-xs whitespace-pre-wrap">
            {JSON.stringify(selected, null, 2)}
            {console.log(selected)}
          </pre>
          <button
            className="mt-2 bg-blue-500 px-4 py-2 text-white"
            onClick={async () => {
              const body = {
                foodkeeper_id: selected['ID'],
                category: selected['Category_ID'],
                name: selected['Name'],
                fridge_days_min: selected['Refrigerate_Min'],
                fridge_days_max: selected['Refrigerate_Max'],
                freezer_days_min: selected['Freeze_Min'],
                freezer_days_max: selected['Freeze_Max'],
                pantry_days_min: selected['Pantry_Min'],
                pantry_days_max: selected['Pantry_Max'],
              };
              console.log(body);
              await axios.post(
                '/unpackaged-foods',
                { headers: { 'content-type': 'application/json' } },
                {
                  data: body,
                },
              );
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
