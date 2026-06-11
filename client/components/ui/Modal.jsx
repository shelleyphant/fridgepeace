import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      {trigger(open)}
      {isOpen &&
        createPortal(
          <div className="absolute top-0 left-0 z-20 h-screen w-full bg-slate-800/50">
            <div className="absolute top-1/2 left-1/2 w-4/5 -translate-x-[50%] -translate-y-[50%] rounded-3xl bg-white p-4 shadow">
              <div className="m-auto max-w-md p-4">{children(close)}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Modal;
