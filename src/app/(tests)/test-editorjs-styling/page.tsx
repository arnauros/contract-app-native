"use client";

import React, { useEffect, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";

export default function TestEditorJSStyling() {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current || !containerRef.current) return;

    const editor = new EditorJS({
      holder: containerRef.current,
      tools: {
        header: Header,
        list: List,
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
        },
      },
      data: {
        blocks: [
          {
            type: "header",
            data: { text: "Test H1 Heading", level: 1 },
          },
          {
            type: "header",
            data: { text: "Test H2 Heading", level: 2 },
          },
          {
            type: "paragraph",
            data: {
              text: "Click on the H1 heading above and look at the dropdown menu. The H1 text should be larger than H2, H3, etc.",
            },
          },
        ],
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">EditorJS Styling Test</h1>
      <p className="mb-4 text-gray-600">
        This page tests the EditorJS dropdown styling. Click on the H1 heading
        below and check if the dropdown shows H1 text at the proper size.
      </p>

      <div className="border border-gray-300 rounded-lg p-4">
        <div ref={containerRef} className="min-h-[300px]" />
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Expected Behavior:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>H1 in dropdown should be larger (16px, bold)</li>
          <li>H2 in dropdown should be medium (15px, medium weight)</li>
          <li>Other headings should be progressively smaller</li>
        </ul>
      </div>
    </div>
  );
}
