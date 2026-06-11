import React, { useState } from 'react';
import { Loading02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';
import { HugeiconsIcon } from '@hugeicons/react';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

const NewFood = ({ onSuccess }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { results, loading, loadMore, hasMore } = useSearch(search);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="relative w-full">
        <HugeiconsIcon
          icon={Search01Icon}
          className="absolute top-1/2 left-4 -translate-y-1/2"
        />
        <Input
          type="text"
          value={search}
          onChangeAction={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
          placeholder="search for..."
          className="pl-12"
        />
      </label>

      {loading && <HugeiconsIcon icon={Loading02Icon} className="animate-spin" />}
      <Modal
        trigger={(open) =>
          !selected &&
          !loading &&
          results.length > 0 && (
            <>
              <ul className="mt-1 flex-1 overflow-y-auto border">
                {results.map((p, i) => (
                  <li
                    key={i}
                    className="cursor-pointer p-1 hover:bg-gray-100"
                    onClick={() => {
                      setSelected(p);
                      open();
                    }}
                  >
                    {p._source === 'foodkeeper'
                      ? `${p.Name}${p.Name_subtitle ? ` (${p.Name_subtitle})` : ''}`
                      : `${p.product_name}${p.brands ? ` (${p.brands})` : ''}`}
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  className="text-water-600 mt-1 w-full text-center text-sm"
                >
                  Load more
                </button>
              )}
            </>
          )
        }
      >
        {(close) => (
          <FoodDetail
            food={selected}
            onSuccess={() => {
              onSuccess?.();
              close();
            }}
            close={() => {
              setSelected(null);
              close();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default NewFood;
