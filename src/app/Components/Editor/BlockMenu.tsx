"use client";

import { useState, useEffect } from "react";
import { GripVertical, ChevronRight, Plus } from "lucide-react";

interface BlockMenuProps {
  editor: any;
  block: any;
}

export const BlockMenu = ({ editor, block }: BlockMenuProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", block.pos.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`
        absolute left-0 
        flex items-center gap-0.5
        h-[24px] w-[40px]
        -translate-x-[calc(100%+8px)]
        opacity-100
        bg-white rounded border border-gray-200 shadow-sm
        z-50
      `}
      style={{
        top: "50%",
        transform: "translateY(-50%)",
      }}
    >
      <button
        className="p-1 hover:bg-gray-100 rounded-l flex-1"
        onClick={() => {
          editor
            .chain()
            .focus()
            .insertContentAt(block.pos, { type: "paragraph", content: [] })
            .run();
        }}
      >
        <Plus className="w-3 h-3 text-gray-400" />
      </button>
      <div className="w-px bg-gray-200 h-full" /> {/* Separator */}
      <button
        className="p-1 hover:bg-gray-100 rounded-r flex-1 cursor-grab"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </button>
    </div>
  );
};
