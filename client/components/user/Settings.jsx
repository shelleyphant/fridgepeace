import React from 'react';
import Button from '../ui/Button';
import { leaveHousehold } from '../../hooks/useHousehold';
import Modal from '../ui/Modal';

const Settings = ({ onReset }) => {
  return (
    <div>
      <Modal trigger={(open) => <Button title="Leave household" color="red" action={open} />}>
        {(close) => (
          <div>
            <p>are you sure you want to leave the household?</p>
            <a onClick={close}>Cancel</a>
            <a
              onClick={() => {
                leaveHousehold();
                onReset();
                close();
              }}
            >
              Leave Household
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Settings;
