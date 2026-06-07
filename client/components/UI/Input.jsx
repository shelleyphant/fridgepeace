import React from 'react';

const Input = ({ type, value, onChangeAction, placeholder }) => {
  return (
    <input
      type={type}
      className="border-water-600 my-4 w-full border p-4"
      value={value}
      onChange={onChangeAction}
      placeholder={placeholder}
    />
  );
};

export default Input;
