import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Drawer = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [show, setShow] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    } else {
      setShow(false);
      const t = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  return (
    <>
      {trigger(open)}
      {rendered &&
        createPortal(
          <div
            className={`absolute bottom-0 left-0 h-11/12 w-full rounded-tl-3xl rounded-tr-3xl bg-white p-4 shadow transition-transform duration-300 ease-in-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <hr
              className="m-auto mb-8 h-1 w-16 rounded border-0 bg-gray-300 hover:cursor-pointer"
              onClick={close}
            ></hr>
            <div className="m-auto max-w-md p-4">{children(close)}</div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Drawer;
