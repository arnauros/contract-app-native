"use client";

import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
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
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div
        ref={containerRef}
        className="prose max-w-none p-6 [&_.cdx-list]:my-2"
      />
    </div>
  );
}
