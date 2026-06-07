import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertSquareIcon } from '@hugeicons/core-free-icons';

const NavButton = ({ name, icon, action }) => {
  return (
    <button name={name} onClick={action}>
      <HugeiconsIcon icon={icon || AlertSquareIcon} size={32} />
    </button>
  );
};

export default NavButton;
