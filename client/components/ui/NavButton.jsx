import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertSquareIcon } from '@hugeicons/core-free-icons';

const NavButton = ({ name, icon, action, showDot }) => {
  return (
    <button name={name} onClick={action} className="relative">
      <HugeiconsIcon icon={icon || AlertSquareIcon} size={32} />
      {showDot && (
        <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-600" />
      )}
    </button>
  );
};

export default NavButton;
