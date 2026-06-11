import React, { useState } from 'react';
import NewFood from './NewFood';
import RecentFood from './RecentFood';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiImageIcon, CancelCircleIcon } from '@hugeicons/core-free-icons';

const AddFood = ({ onClose, onSuccess, inventory }) => {
  const [files, setFiles] = useState([]);

  const handleUpload = (e) => {
    setFiles(Array.from(e.target.files).map((file) => URL.createObjectURL(file)));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Modal
        trigger={(open) => (
          <Button
            title={
              <>
                <HugeiconsIcon icon={AiImageIcon} className="inline" /> Quick Scan
              </>
            }
            action={() => open()}
          />
        )}
      >
        {(close) => (
          <div>
            <span>Upload two clear images to get started:</span>
            <input type="file" accept="image/*" multiple onChange={handleUpload} />
            <div className="grid grid-cols-2 gap-2">
              {files.map((file, i) => (
                <div key={i} className="relative">
                  <img src={file} alt="Uploaded preview" />
                  <HugeiconsIcon
                    icon={CancelCircleIcon}
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 rounded-2xl bg-red-800 text-red-100 hover:cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <Button title="Scan Now" />
          </div>
        )}
      </Modal>
      <RecentFood inventory={inventory} onSuccess={onSuccess ?? onClose} />
      <NewFood onSuccess={onSuccess ?? onClose} />
    </div>
  );
};

export default AddFood;
