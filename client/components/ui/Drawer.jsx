import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_DRAG_THRESHOLD = 80;

const Drawer = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [show, setShow] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY = useRef(null);
  const panelRef = useRef(null);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
    } else {
      setShow(false);
      setDragY(0);
      const t = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!rendered || !panelRef.current) return;
    panelRef.current.getBoundingClientRect();
    requestAnimationFrame(() => setShow(true));
  }, [rendered]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    touchStartY.current = null;
    if (dragY > CLOSE_DRAG_THRESHOLD) {
      close();
    } else {
      setDragY(0);
    }
  };

  return (
    <>
      {trigger(open)}
      {rendered &&
        createPortal(
          <div
            className={`absolute top-0 left-0 z-10 h-screen w-full bg-slate-800/50 transition-opacity duration-300 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}
            onClick={close}
          >
            <div
              ref={panelRef}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
              className={`absolute bottom-0 left-0 flex h-11/12 w-full flex-col overflow-hidden rounded-tl-3xl rounded-tr-3xl bg-white p-4 shadow ${dragging ? '' : 'transition-transform duration-300 ease-in-out'} ${show ? 'translate-y-0' : 'translate-y-full'}`}
            >
              <hr
                className="m-auto mb-8 h-1 w-16 shrink-0 rounded border-0 bg-gray-300 hover:cursor-pointer"
                onClick={close}
              ></hr>
              <div className="m-auto flex min-h-0 w-full max-w-md grow flex-col p-4">
                {children(close)}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Drawer;
