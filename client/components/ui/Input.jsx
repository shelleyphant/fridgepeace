import React from 'react';

const Input = ({ type, value, onChangeAction, placeholder, className }) => {
  return (
    <input
      type={type}
      className={`${className} border-water-600 my-4 w-full border p-4`}
      value={value}
      onChange={onChangeAction}
      placeholder={placeholder}
    />
  );
};

export default Input;
