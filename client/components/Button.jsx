import React from 'react';

const Button = ({ title, action }) => {
  return (
    <div
      className="inline-block rounded-full bg-water-600 px-6 py-2 text-center text-sm font-medium text-white hover:cursor-pointer hover:bg-water-700"
      onClick={action}
    >
      {title}
    </div>
  );
};

export default Button;
