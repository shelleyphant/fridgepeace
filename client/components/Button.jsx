import React from 'react';

const Button = ({ title, action }) => {
  return (
    <div
      className="bg-water-800 my-4 rounded-4xl px-6 py-2 text-white hover:cursor-pointer"
      onClick={action}
    >
      {title}
    </div>
  );
};

export default Button;
