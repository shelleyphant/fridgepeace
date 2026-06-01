const FloatingAddButton = ({ onClick }) => (
  <button
    className="fixed bottom-6 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-water-600 text-2xl text-white shadow-lg hover:bg-water-700 active:scale-95"
    onClick={onClick}
  >
    +
  </button>
);

export default FloatingAddButton;
