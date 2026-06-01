const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: '👤 Mine' },
  { value: 'fridge', label: '🧊 Fridge' },
  { value: 'freezer', label: '❄️ Freezer' },
  { value: 'pantry', label: '📦 Pantry' },
];

const FilterBar = ({ value, onChange }) => (
  <div className="mb-3">
    <div className="flex flex-wrap gap-1">
      {FILTER_OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`rounded-full px-3 py-1 text-center text-sm border ${
            value === o.value
              ? 'bg-water-600 text-white border-water-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export default FilterBar;
