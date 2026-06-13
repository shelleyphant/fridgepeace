import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

const Select = ({ value, onChange, className, children }) => {
  return (
    <div className="relative">
      <select
        className={`${className} border-water-600 my-4 w-full appearance-none border p-4 pr-10`}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        size={20}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
      />
    </div>
  );
};

export default Select;
