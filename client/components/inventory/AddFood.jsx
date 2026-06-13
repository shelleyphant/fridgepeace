import React, { useState } from 'react';
import moment from 'moment';
import NewFood from './NewFood';
import AIScan from './AIScan';
import RecentFood from './RecentFood';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import AIInsert from './AIInsert';

const AddFood = ({ onClose, onSuccess, inventory }) => {
  const { recentFoods } = useRecentFoods(inventory);
  const [showScan, setShowScan] = useState(false);
  const [scanFood, setScanFood] = useState(null);
  const [scanExtras, setScanExtras] = useState(null);

  const handleScanComplete = (food, extras) => {
    setScanFood(food);
    setScanExtras(extras ?? {});
  };

  const closeModal = () => {
    setScanFood(null);
    setScanExtras(null);
  };

  if (showScan) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <AIScan
          onBack={() => setShowScan(false)}
          onComplete={handleScanComplete}
        />

        <Modal
          open={!!scanFood}
          setOpen={(open) => { if (!open) closeModal(); }}
        >
          {(close) => (
            <AIInsert
              food={scanFood}
              extras={scanExtras}
              onSuccess={() => {
                onSuccess?.();
                close();
                setShowScan(false);
              }}
              onCancel={() => {
                closeModal();
                close();
              }}
            />
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {recentFoods.length > 0 && (
        <span className="text-water-800 text-lg font-medium">Recently Added:</span>
      )}
      <RecentFood inventory={inventory} onSuccess={onSuccess ?? onClose} />
      <span className="text-water-800 mt-6 text-lg font-medium">
        Find something new!
      </span>
      <Button
        title="AI Scan"
        action={() => setShowScan(true)}
        className="mb-3"
      />
      <NewFood onSuccess={onSuccess ?? onClose} />
    </div>
  );
};

export default AddFood;
