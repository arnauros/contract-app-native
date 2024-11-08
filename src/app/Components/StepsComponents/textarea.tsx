import React, { useState } from "react";

interface TextAreaProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

const TextArea: React.FC<TextAreaProps> = ({
  placeholder,
  value,
  onChange,
}) => {
  return (
    <textarea
      value={value}
      className="p-4 border-white w-full h-[220px] focus:outline-none focus:ring-1 focus:ring-gray-200"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default TextArea;
