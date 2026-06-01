import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';

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

const NewFood = ({ onSuccess, onClose }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { results, loading, hasSearched, search: triggerSearch, clear } = useSearch();
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        clear();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clear]);

  const handleSearch = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setSelected(null);
    triggerSearch(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearch('');
    clear();
    setSelected(null);
  };

  return (
    <div ref={searchRef}>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
          placeholder="Search food name"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          value={search}
        />
        <button
          className="rounded-full bg-water-600 px-4 py-2 text-center text-sm text-white hover:bg-water-700 disabled:opacity-50"
          onClick={handleSearch}
          disabled={loading || !search.trim()}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {hasSearched && !selected && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">
              {results.length > 0 ? `${results.length} results` : 'No results'}
            </p>
            <button
              className="text-xs text-water-600 hover:text-water-700"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
          {results.length > 0 && (
            <ul className="rounded-lg border border-gray-300 max-h-64 overflow-y-auto">
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
        </div>
      )}

      {loading && (
        <p className="mt-2 text-sm text-gray-500">Searching...</p>
      )}

      {selected && <FoodDetail food={selected} onSuccess={onSuccess ?? onClose} />}
    </div>
  );
};

export default NewFood;
