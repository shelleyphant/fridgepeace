import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const levelStyle = {
  success: 'bg-lime-200 text-lime-800 border-lime-800',
  warning: 'bg-amber-200 text-amber-800 border-amber-800',
  error: 'bg-red-200 text-red-800 border-red-800',
  notice: 'bg-cyan-200 text-cyan-800 border-cyan-800',
};

const Toast = ({ level, message }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className={`fixed top-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 rounded-2xl border-2 p-4 ${levelStyle[level]}`}
    >
      {message}
    </div>,
    document.body,
  );
};

export default Toast;
