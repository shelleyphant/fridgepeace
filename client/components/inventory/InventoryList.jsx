import SkeletonCard from './SkeletonCard';
import FoodCard from './FoodCard';
import FoodEditForm from './FoodEditForm';

const InventoryList = ({
  items, loading, error, editingItem,
  onRetry, onDelete, onEdit, onEditSave, onEditCancel,
}) => {
  if (error) {
    return (
      <div className="mt-4 rounded bg-red-50 p-4 text-center">
        <p className="text-red-600">Could not load inventory.</p>
        <button
          className="mt-2 rounded-full bg-red-500 px-4 py-1.5 text-center text-sm text-white hover:bg-red-600"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-400">
        <p className="text-lg">Your fridge is empty!</p>
        <p className="mt-1 text-sm">Tap + to add your first item.</p>
      </div>
    );
  }

  return (
    <div>
      {editingItem && (
        <FoodEditForm
          item={editingItem}
          onSave={onEditSave}
          onCancel={onEditCancel}
        />
      )}
      {items.map((item) =>
        editingItem?.id === item.id ? null : (
          <FoodCard key={item.id} item={item} onDelete={onDelete} onEdit={onEdit} />
        )
      )}
    </div>
  );
};

export default InventoryList;
