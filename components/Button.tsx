import React from 'react';

interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string; // Allow custom Tailwind classes to be passed
  [key: string]: any; // Allow other props like aria-label
}

const Button: React.FC<ButtonProps> = ({ onClick, children, disabled = false, className = '', ...rest }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-full text-white font-semibold transition-all duration-300
        bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300
        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;