import React from 'react';

interface IconButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel: string;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, children, className = '', ariaLabel }) => {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`p-1.5 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${className}`}
    >
      {children}
    </button>
  );
};

export default IconButton;