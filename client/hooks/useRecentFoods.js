import { useInventory } from './useInventory';

export function useRecentFoods() {
  const { inventory, loading, error } = useInventory();

  const recentFoods = [...inventory]
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 5);

  return { recentFoods, loading, error };
}
