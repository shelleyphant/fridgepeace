import React, { useState } from 'react';
import { Loading02Icon } from '@hugeicons/core-free-icons';
import { useSearch } from '../../hooks/useSearch';
import FoodDetail from './FoodDetail';
import { HugeiconsIcon } from '@hugeicons/react';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useInventory } from '../../hooks/useInventory';

const NewFood = ({ onSuccess }) => {
  const { refresh } = useInventory();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { results, loading } = useSearch(search);

  return (
    <div>
      <Input
        type="text"
        value={search}
        onChangeAction={(e) => {
          setSearch(e.target.value);
          setSelected(null);
        }}
        placeholder="search for..."
      />

      {loading && <HugeiconsIcon icon={Loading02Icon} className="animate-spin" />}
      <Modal
        trigger={(open) =>
          !selected &&
          !loading &&
          results.length > 0 && (
            <ul className="mt-1 border">
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
          )
        }
      >
        {(close) => (
          <FoodDetail
            food={selected}
            onSuccess={() => {
              onSuccess?.();
              refresh();
              close();
            }}
            close={close}
          />
        )}
      </Modal>
    </div>
  );
};

export default NewFood;
