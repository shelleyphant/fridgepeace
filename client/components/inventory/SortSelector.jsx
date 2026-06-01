const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'expiry', label: 'Expiring Soon' },
];

const SortSelector = ({ value, onChange }) => (
  <div className="mb-3 flex justify-end">
    <select
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export default SortSelector;
