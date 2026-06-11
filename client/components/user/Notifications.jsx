import React from 'react';
import moment from 'moment/moment';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Notification01Icon,
  UserGroupIcon,
  ShareKnowledgeIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import Button from '../ui/Button';

const typeIcon = {
  member_joined: UserGroupIcon,
  food_shared: ShareKnowledgeIcon,
  expiry_reminder: Clock01Icon,
};

const Notifications = ({
  notifications,
  loading,
  markAsRead,
  markAllAsRead,
  onClose,
}) => {
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-water-800 text-lg font-medium">Notifications</span>
        {hasUnread && (
          <button
            type="button"
            className="text-water-600 text-sm hover:underline"
            onClick={markAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex min-h-0 grow flex-col gap-2 overflow-y-auto">
        {loading ? (
          <p className="text-center text-sm text-gray-500">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-sm text-gray-500">You're all caught up.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read && markAsRead(n.id)}
              className={`flex items-start gap-3 rounded-2xl p-4 text-left ${
                n.read ? 'bg-white' : 'bg-water-100'
              }`}
            >
              <HugeiconsIcon
                icon={typeIcon[n.notification_type] ?? Notification01Icon}
                className="text-water-600 mt-1 shrink-0"
                size={20}
              />
              <span className="flex flex-col">
                <span className="text-sm">{n.message}</span>
                <span className="text-xs text-gray-400">
                  {moment.utc(n.created_at).local().fromNow()}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
