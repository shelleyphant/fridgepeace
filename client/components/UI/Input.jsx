import React from 'react';

const Input = ({ type, value, onChangeAction }) => {
  return (
    <input
      type={type}
      className="w-full border"
      value={value}
      onChange={onChangeAction}
    />
  );
};

export default Input;
