import React from 'react';

const buttonColor = {
  blue: 'bg-water-800 hover:bg-water-600',
  red: 'bg-red-800 hover:bg-red-600',
};

const Button = ({ title, action, color, className }) => {
  return (
    <button
      className={`${className} ${buttonColor[color] || buttonColor['blue']} my-4 block rounded-4xl px-6 py-2 text-center text-lg text-white hover:cursor-pointer`}
      onClick={action}
    >
      {title}
    </button>
  );
};

export default Button;
