import React, { useState } from 'react';
import NavButton from './NavButton';
import {
  BellIcon,
  Cancel01Icon,
  Logout02Icon,
  Menu01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import Notifications from '../user/Notifications';
import Settings from '../user/Settings';
import Drawer from './Drawer';
import { logOut } from '../../hooks/useMembership';

const Navigation = ({ onReset }) => {
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
          <Drawer
            trigger={(open) => (
              <NavButton name="Notifications" icon={BellIcon} action={open} />
            )}
          >
            {(close) => (
              <Notifications
                onClose={close}
                onSuccess={() => {
                  close();
                }}
              />
            )}
          </Drawer>
        </li>
        <li>
          <Drawer
            trigger={(open) => (
              <NavButton name="Settings" icon={Settings01Icon} action={open} />
            )}
          >
            {(close) => (
              <Settings
                onClose={close}
                onSuccess={() => {
                  close();
                }}
                onReset={onReset}
              />
            )}
          </Drawer>
        </li>
        <li>
          <NavButton
            name="Log Out"
            icon={Logout02Icon}
            action={() => {
              logOut();
              onReset();
            }}
          />
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
