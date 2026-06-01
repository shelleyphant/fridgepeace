import React from 'react';

const EVENT_ICON = {
  added: '➕',
  consumed: '✅',
  expired: '⏰',
  moved: '📦',
};

const EVENT_LABEL = {
  added: 'added this item',
  consumed: 'consumed some',
  expired: 'marked as expired',
  moved: 'moved this item',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

const SkeletonTimeline = () => (
  <div className="mt-4 rounded-lg bg-gray-50 p-3">
    <p className="mb-2 text-sm font-semibold text-gray-600">📋 History</p>
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="h-5 w-5 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-2 w-16 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const EventTimeline = ({ events, loading, error }) => {
  if (loading) return <SkeletonTimeline />;
  if (error) return null;

  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-3">
      <p className="mb-2 text-sm font-semibold text-gray-600">📋 History</p>
      {events.length === 0 ? (
        <p className="text-sm text-gray-400">No history yet.</p>
      ) : (
        <div className="space-y-0">
          {events.map((event, i) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="text-base leading-5">
                  {EVENT_ICON[event.event_type] ?? '📝'}
                </span>
                {i < events.length - 1 && <div className="w-px flex-1 bg-gray-300 min-h-[24px]" />}
              </div>
              <div className="pb-3">
                <p className="text-sm">
                  <span className="font-medium">{event.member_display_name}</span>{' '}
                  {EVENT_LABEL[event.event_type] ?? event.event_type}
                </p>
                <p className="text-xs text-gray-400">{formatDate(event.date_occurred)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventTimeline;
