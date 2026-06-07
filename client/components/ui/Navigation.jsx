import React, { useState } from 'react';
import NavButton from './NavButton';
import {
  BellIcon,
  Cancel01Icon,
  Logout02Icon,
  Menu01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <nav className="absolute top-6 right-6 flex flex-col items-end">
      <NavButton
        name="Menu"
        icon={isOpen ? Cancel01Icon : Menu01Icon}
        action={() => {
          setIsOpen(isOpen ? false : true);
        }}
      />
      <ul className={isOpen ? `flex` : `hidden`}>
        <li>
          <NavButton name="Notifications" icon={BellIcon} />
        </li>
        <li>
          <NavButton name="Settings" icon={Settings01Icon} />
        </li>
        <li>
          <NavButton name="Log Out" icon={Logout02Icon} />
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
