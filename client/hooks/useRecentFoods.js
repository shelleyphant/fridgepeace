export function useRecentFoods(inventory = []) {
  const recentFoods = [...inventory]
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 5);

  return { recentFoods };
}
