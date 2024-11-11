"use client";

import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Image from "@editorjs/image";
import { useEffect, useRef, useState } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { ContractAudit } from "./ContractAudit";

interface ContractEditorProps {
  formData: any;
  initialContent: any;
  onAuditFix?: () => void;
}

export function ContractEditor({
  formData,
  initialContent,
  onAuditFix,
}: ContractEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.png");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorContent, setEditorContent] = useState(initialContent);

  // Initialize editor with change handler
  useEffect(() => {
    if (editorRef.current || !containerRef.current) return;

    const editor = new EditorJS({
      holder: containerRef.current,
      tools: {
        header: Header,
        list: List,
        paragraph: Paragraph,
        image: {
          class: Image,
          config: {
            endpoints: {
              byFile: "/api/uploadImage",
            },
          },
        },
      },
      data: initialContent,
      onReady: () => {
        // Start audit immediately when editor is ready
        setEditorContent(initialContent);
      },
      onChange: async (api) => {
        const content = await api.saver.save();
        setEditorContent(content);
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [initialContent]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just create a local URL for preview
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const highlightBlock = (position: any) => {
    console.log("Highlighting block:", position); // Debug log

    // Remove existing highlights
    document
      .querySelectorAll(".audit-highlight, .audit-highlight-word")
      .forEach((el) => {
        el.classList.remove("audit-highlight", "audit-highlight-word");
        el.removeAttribute("data-highlight-text");
      });

    // Find all editor blocks
    const editorElement = containerRef.current;
    if (!editorElement) {
      console.log("Editor element not found"); // Debug log
      return;
    }

    const blocks = editorElement.querySelectorAll(".ce-block");
    console.log("Found blocks:", blocks.length); // Debug log

    if (!blocks || !position) {
      console.log("No blocks or position found"); // Debug log
      return;
    }

    const targetBlock = blocks[position.blockIndex];
    console.log("Target block:", targetBlock); // Debug log

    if (!targetBlock) {
      console.log("Target block not found"); // Debug log
      return;
    }

    // Add highlight class
    targetBlock.classList.add("audit-highlight");

    // Scroll into view
    targetBlock.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="px-8">
        {/* Image with same padding as before */}
        <div className="pt-[88px]">
          <div
            onClick={handleImageClick}
            className="h-[8rem] w-[8rem] bg-gray-100 rounded-lg mb-12 ml-[90px] cursor-pointer overflow-hidden hover:opacity-90 transition-opacity relative"
          >
            {logoUrl === "/placeholder-logo.png" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <PhotoIcon className="h-6 w-6" />
                <span className="text-[10px] mt-1">Add logo</span>
              </div>
            ) : (
              <img
                src={logoUrl}
                alt="Contract logo"
                className="w-full h-full object-cover"
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Rest of the editor */}
        <div ref={containerRef} className="prose max-w-none" />
      </div>

      {/* Contract Audit Panel - Fixed position */}
      <div className="fixed right-8 top-32 w-80">
        <ContractAudit
          editorContent={editorContent}
          onFixClick={() => onAuditFix?.()}
          onIssueClick={highlightBlock}
        />
      </div>
    </div>
  );
}
