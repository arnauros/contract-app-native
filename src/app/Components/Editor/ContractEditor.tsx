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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-8">
        {/* Image and H1 container */}
        <div className="pt-[88px] flex flex-col">
          <div className="w-16 h-16 bg-gray-100 rounded-lg mb-12">
            <img
              src="/placeholder-logo.png"
              alt="Contract logo"
              className="w-full h-full object-cover opacity-0"
            />
          </div>
        </div>

        {/* EditorJS container */}
        <div
          ref={containerRef}
          className="prose max-w-none pb-8
            [&_.ce-block__content]:max-w-full
            [&_.ce-toolbar__plus]:hidden
            [&_.ce-toolbar__settings]:hidden
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
