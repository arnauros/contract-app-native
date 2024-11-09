"use client";

import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Image from "@editorjs/image";
import { useEffect, useRef, useState } from "react";

interface ContractEditorProps {
  formData: any;
  initialContent: any;
}

export function ContractEditor({
  formData,
  initialContent,
}: ContractEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const [logoUrl, setLogoUrl] = useState("/placeholder-logo.png");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just create a local URL for preview
      const url = URL.createObjectURL(file);
      setLogoUrl(url);

      // TODO: Add actual image upload functionality here
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/uploadImage', ...);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-8">
        {/* Image with same extra left padding */}
        <div className="pt-[88px] pl-[48px]">
          <div
            onClick={handleImageClick}
            className="w-16 h-16 bg-gray-100 rounded-lg mb-12 cursor-pointer overflow-hidden hover:opacity-90 transition-opacity"
          >
            <img
              src={logoUrl}
              alt="Contract logo"
              className="w-full h-full object-cover"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* EditorJS container */}
        <div
          ref={containerRef}
          className="prose max-w-none
            [&_.ProseMirror]:!pl-0
            [&_.ce-block__content]:max-w-full
            [&_.ce-header]:font-inter
            [&_.ce-header]:text-gray-900
            [&_.ce-header]:font-semibold
            [&_.ce-paragraph]:text-gray-700
            [&_.ce-paragraph]:leading-relaxed
            [&_.cdx-list]:my-2
            [&_.cdx-list]:text-gray-700
            [&_.cdx-list__item]:pl-2
            [&_.cdx-list]:text-base
            [&_h1]:text-4xl
            [&_h2]:text-2xl
            [&_h2]:mt-8
            [&_h2]:mb-4"
        />
      </div>
    </div>
  );
}
