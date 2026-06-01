import React, { useEffect, useState } from 'react';
import AddFood from './inventory/AddFood';

const Drawer = ({ isOpen, onClose, onSuccess }) => {
  const [rendered, setRendered] = useState(false);
  const [show, setShow] = useState(false);

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

  if (!rendered) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-black/40 transition-opacity duration-300"
        style={{ opacity: show ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 h-11/12 w-full rounded-tl-2xl rounded-tr-2xl bg-white p-4 shadow transition-transform duration-300 ease-in-out ${show ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <hr
          className="m-auto h-1 w-16 rounded border-0 bg-gray-300 hover:cursor-pointer"
          onClick={onClose}
        ></hr>
        <AddFood onClose={onClose} onSuccess={onSuccess} />
      </div>
    </>
  );
};

export default Drawer;
