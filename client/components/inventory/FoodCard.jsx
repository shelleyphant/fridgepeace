import React, { useState } from 'react';
import moment from 'moment/moment';
import { HugeiconsIcon } from '@hugeicons/react';
import { categoryIcon } from '../../source/categoryIcons';
import { useAddFood } from '../../hooks/useAddFood';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Drawer from '../ui/Drawer';
import Select from '../ui/Select';
import FoodDetail from './FoodDetail';
import {
  Clock01Icon,
  ClockCheckIcon,
  ClockAlertIcon,
  ClockFadingIcon,
  RemoveCircleIcon,
  AddCircleIcon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';

const FoodCard = ({ item, className, onChange, members = [] }) => {
  const Icon = categoryIcon(item.category);
  const { updateFood, deleteFood, transferOwnership } = useAddFood();
  const [pendingOwnerId, setPendingOwnerId] = useState('');

  const currentOwnerId =
    members.find((m) => item.owners?.includes(m.display_name))?.id ?? '';

  const currentUserId = parseInt(localStorage.getItem('member_id'));
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOwner = item.owners?.includes(currentMember?.display_name) ?? false;

  const handleTransferOwnership = async (close) => {
    await transferOwnership(item, parseInt(pendingOwnerId));
    onChange?.();
    close();
  };

  const handleIncrement = async () => {
    await updateFood(item, { additionalQuantity: 1 });
    onChange?.();
  };

  const handleDecrement = async () => {
    await updateFood(item, { additionalQuantity: -1 });
    onChange?.();
  };

  const handleRemove = async () => {
    await deleteFood(item);
    onChange?.();
  };

  const expiryDays = moment(item.expiry_date, 'YYYY-MM-DD').diff(moment(), 'days');
  const expiryStyle = () => {
    if (!item.expiry_date) return '';
    switch (true) {
      case expiryDays < 0:
        return { bg: 'bg-red-100', text: 'text-red-700', icon: ClockAlertIcon };
      case expiryDays <= 2:
        return { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock01Icon };
      case expiryDays <= 10:
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: ClockFadingIcon };
      default:
        return { bg: 'bg-lime-100', text: 'text-lime-700', icon: ClockCheckIcon };
    }
  };

  return (
    <div className={`${className} relative rounded-4xl bg-white p-6 pt-4`}>
      <span
        className={`rounded-4xl ${expiryStyle().bg} absolute top-0 left-0 inline-block p-4`}
      >
        <HugeiconsIcon icon={Icon} size={32} />
      </span>

      <span className="text-water-900 mb-6 ml-14 block text-2xl font-bold">
        {item.name}
      </span>
      <span className="rounded-xl bg-indigo-200 px-2 text-xs">
        {item.owners?.join(', ')}
      </span>

      <span className="rounded-xl bg-green-100 px-2 text-xs capitalize">
        {item.storage_location}
      </span>

      <div className="absolute right-4 bottom-8 flex flex-row items-center gap-2">
        {parseFloat(item.quantity) <= 1 ? (
          <Modal
            trigger={(open) => (
              <button type="button" onClick={open} aria-label="Remove one">
                <HugeiconsIcon icon={RemoveCircleIcon} className="inline" />
              </button>
            )}
          >
            {(close) => (
              <div>
                <p className="mb-4">Remove {item.name} from your inventory?</p>
                <div className="flex justify-end gap-2">
                  <Button title="Cancel" action={close} color="blue" />
                  <Button
                    title="Remove"
                    color="red"
                    action={async () => {
                      await handleRemove();
                      close();
                    }}
                  />
                </div>
              </div>
            )}
          </Modal>
        ) : (
          <button type="button" onClick={handleDecrement} aria-label="Remove one">
            <HugeiconsIcon icon={RemoveCircleIcon} className="inline" />
          </button>
        )}
        <span className="font-sansation text-water-600 inline text-2xl">
          {item.quantity}
        </span>
        <button type="button" onClick={handleIncrement} aria-label="Add one">
          <HugeiconsIcon icon={AddCircleIcon} className="inline" />
        </button>
      </div>

      <span>
        {item.expiry_date ? (
          <div className="flex gap-2">
            <HugeiconsIcon
              icon={expiryStyle().icon}
              size={20}
              className={`inline ${expiryStyle().text} `}
            />
            <span className="text-sm">{` Expires ${moment(item.expiry_date, 'YYYY-MM-DD').fromNow()}`}</span>
          </div>
        ) : (
          'No expiry set'
        )}
      </span>

      <div className="absolute right-0 -bottom-2">
        {isOwner && (
          <Drawer
            trigger={(open) => (
              <button onClick={open} className="bg-water-200 rounded-4xl p-2">
                <HugeiconsIcon icon={Edit02Icon} size={16} />
              </button>
            )}
          >
            {(close) => (
              <FoodDetail
                food={item}
                inventoryItem={item}
                initialQuantity={item.quantity}
                quantityMode="absolute"
                submitLabel="Update"
                onSuccess={() => {
                  onChange?.();
                  close();
                }}
                extraFields={
                  <Modal
                    trigger={(open) => (
                      <>
                        <label>Owner</label>
                        <Select
                          value={currentOwnerId}
                          onChange={(e) => {
                            setPendingOwnerId(e.target.value);
                            open();
                          }}
                        >
                          <option value="" disabled>
                            Owner
                          </option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.display_name}
                            </option>
                          ))}
                        </Select>
                      </>
                    )}
                  >
                    {(closeModal) => (
                      <div>
                        <p className="mb-4">
                          Change the owner of {item.name} to{' '}
                          {
                            members.find((m) => m.id === parseInt(pendingOwnerId))
                              ?.display_name
                          }
                          ?
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button title="Cancel" action={closeModal} color="blue" />
                          <Button
                            title="Confirm"
                            color="red"
                            action={() => handleTransferOwnership(closeModal)}
                          />
                        </div>
                      </div>
                    )}
                  </Modal>
                }
              />
            )}
          </Drawer>
        )}
      </div>
    </div>
  );
};

export default FoodCard;
