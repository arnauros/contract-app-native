import React from "react";

interface IconButtonProps {
  src: string;
  alt: string;
}

const IconButton: React.FC<IconButtonProps> = ({ src, alt }) => {
  return (
    <button className="bg-transparent border-none p-0 cursor-pointer">
      <img
        loading="lazy"
        src={src}
        alt={alt}
        className="object-contain shrink-0 self-stretch my-auto w-4 aspect-square"
      />
    </button>
  );
};

export default IconButton;
