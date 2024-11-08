"use client";

import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import { useEffect, useState, useRef } from "react";
import Skeleton from "@/app/Components/Editor/skeleton";

interface ContractEditorProps {
  formData: {
    projectBrief: string;
    techStack: string;
    startDate: string;
    endDate: string;
    status: string;
    id: string;
  } | null;
  initialContent: any;
}

export function ContractEditor({
  formData,
  initialContent,
}: ContractEditorProps) {
  const [isFullyReady, setIsFullyReady] = useState(false);
  const editorInstance = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializationAttempted = useRef(false);

  useEffect(() => {
    console.log("Form data received:", formData);
    console.log("Initial content:", initialContent);

    const initEditor = async () => {
      if (editorInstance.current) {
        console.log("Editor already initialized");
        return;
      }

      if (!containerRef.current) {
        console.log("Container not ready");
        return;
      }

      try {
        console.log("Initializing editor...");
        initializationAttempted.current = true;

        const editor = new EditorJS({
          holder: containerRef.current,
          tools: {
            header: Header,
            list: List,
            paragraph: Paragraph,
          },
          data: initialContent || {
            blocks: [
              {
                type: "header",
                data: {
                  text: "Software Development Agreement",
                  level: 1,
                },
              },
            ],
          },
          onReady: () => {
            console.log("Editor ready!");
            setIsFullyReady(true);
          },
          onChange: (api, event) => {
            console.log("Content changed");
          },
        });

        editorInstance.current = editor;
        await editor.isReady;
        console.log("Editor fully initialized");
        setIsFullyReady(true);
      } catch (err) {
        console.error("Editor initialization failed:", err);
        initializationAttempted.current = false;
      }
    };

    if (formData) {
      console.log("Starting initialization with form data");
      initEditor();
    }

    return () => {
      if (editorInstance.current) {
        console.log("Cleaning up editor");
        editorInstance.current.destroy();
        editorInstance.current = null;
        initializationAttempted.current = false;
      }
    };
  }, [formData, initialContent]);

  return (
    <div className="relative min-h-[500px]">
      {!isFullyReady && <Skeleton />}
      <div
        ref={containerRef}
        className="prose max-w-none"
        style={{
          visibility: isFullyReady ? "visible" : "hidden",
          minHeight: "500px",
        }}
      />
    </div>
  );
}
