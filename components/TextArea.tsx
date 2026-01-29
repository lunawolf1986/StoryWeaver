
import React, { useRef, useEffect } from 'react';

interface TextAreaProps {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
  className?: string; // Allow custom Tailwind classes
  autoFocus?: boolean;
  maxHeight?: string; // Optional max height
}

const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  rows = 5,
  className = '',
  autoFocus = false,
  maxHeight,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // High-performance Auto-resize engine
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily reset height to calculate new scrollHeight correctly
      textarea.style.height = '0px';
      // Set to scrollHeight to match content perfectly. 
      // This will respect the 'min-height' set by the 'rows' attribute/style.
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, rows]); // Now reacts to 'rows' changes too

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={rows}
      autoFocus={autoFocus}
      className={`
        w-full p-3 text-white
        placeholder-gray-500
        focus:outline-none
        transition-all duration-100 ease-out
        selection:bg-indigo-500 selection:bg-opacity-40
        ${readOnly ? 'bg-transparent cursor-default' : 'bg-gray-700/30'}
        ${maxHeight ? 'overflow-y-auto' : 'overflow-hidden'}
        ${className}
      `}
      style={{ 
        minHeight: `${rows * 1.5}rem`,
        maxHeight: maxHeight || 'none',
        resize: 'none',
        lineHeight: '1.5'
      }}
    />
  );
};

export default TextArea;
