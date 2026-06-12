import React, { useEffect, useRef, useState } from 'react';
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
import { useNotifications } from '../../hooks/useNotifications';

const Navigation = ({ onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const hasUnread = notifications.some((n) => !n.read);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <nav ref={navRef} className="absolute top-6 right-6 flex flex-col items-end">
      <NavButton
        name="Menu"
        icon={isOpen ? Cancel01Icon : Menu01Icon}
        action={() => {
          setIsOpen(isOpen ? false : true);
        }}
        showDot={hasUnread}
      />
      <ul
        className={`absolute -top-8 right-10 mt-4 flex gap-2 rounded-3xl bg-white p-4 shadow transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'pointer-events-none translate-x-[calc(200%)]'}`}
      >
        <li>
          <Drawer
            trigger={(open) => (
              <NavButton
                name="Notifications"
                icon={BellIcon}
                action={open}
                showDot={hasUnread}
              />
            )}
            onClose={() => setIsOpen(false)}
          >
            {(close) => (
              <Notifications
                notifications={notifications}
                loading={loading}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                onClose={close}
                onSuccess={close}
              />
            )}
          </Drawer>
        </li>
        <li>
          <Drawer
            trigger={(open) => (
              <NavButton name="Settings" icon={Settings01Icon} action={open} />
            )}
            onClose={() => setIsOpen(false)}
          >
            {(close) => (
              <Settings onClose={close} onSuccess={close} onReset={onReset} />
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
