import React from 'react';
import Button from '../ui/Button';
import { leaveHousehold } from '../../hooks/useHousehold';
import Modal from '../ui/Modal';

const Settings = ({ onReset }) => {
  return (
    <div>
      <Modal
        trigger={(open) => <Button title="Leave household" color="red" action={open} />}
      >
        {(close) => (
          <div>
            <p>Are you sure you want to leave the household?</p>
            <Button title="Cancel" action={close} color="blue" />
            <Button
              title=" Leave Household"
              color="red"
              action={() => {
                leaveHousehold();
                onReset();
                close();
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Settings;
