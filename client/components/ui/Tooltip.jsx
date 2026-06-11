import React, { useState } from 'react';
import { HelpCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

const Tooltip = ({ message, confirmation }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(true)} aria-label="Help">
        <HugeiconsIcon icon={HelpCircleIcon} />
      </button>
      {open && (
        <article className="absolute z-10 mt-2 w-64 rounded-2xl bg-white p-4 text-sm shadow-lg">
          <p>{message}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-water-600 mt-2 font-bold"
          >
            {confirmation ?? 'Got It!'}
          </button>
        </article>
      )}
    </div>
  );
};

export default Tooltip;
