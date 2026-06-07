import React, { useState } from 'react';
import NavButton from './NavButton';
import { Menu01Icon } from '@hugeicons/core-free-icons';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav>
      <NavButton
        name="menu"
        icon={Menu01Icon}
        action={() => {
          setIsOpen(isOpen ? false : true);
        }}
      />
      <ul className={isOpen ? `flex` : `hidden`}>
        <li>
          <NavButton />
        </li>
        <li>
          <NavButton />
        </li>
        <li>
          <NavButton />
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
