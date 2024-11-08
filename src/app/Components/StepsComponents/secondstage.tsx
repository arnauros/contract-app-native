import React, { useState, useRef } from "react";
import TopHeading from "./headerform";
import FormFooter from "./formfooter";

interface TechStack {
  id: string;
  name: string;
  logo: string;
  selected: boolean;
}

interface SecondStageProps {
  onBack: () => void;
  onNext: () => void;
  techStackText: string;
  onTechStackChange: (text: string) => void;
}

const SecondStage: React.FC<SecondStageProps> = ({
  onBack,
  onNext,
  techStackText,
  onTechStackChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const PLACEHOLDER = "The tech stack includes ";

  const techStacks = [
    {
      id: "figma",
      name: "Figma",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7ae71bec888a9352f_Figma.svg",
    },
    {
      id: "webflow",
      name: "Webflow",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc775733ae70a69981d_webflow.svg",
    },
    {
      id: "framer",
      name: "Framer",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7dcce2d74f9ab1081_Framer.svg",
    },
    {
      id: "xano",
      name: "Xano",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7d7f14dd0052aaf9a_Xano.svg",
    },
    {
      id: "zapier",
      name: "Zapier",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7d89355318bf8fb73_Zapier.svg",
    },
    {
      id: "airtable",
      name: "Airtable",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc72ab3a48a9a70d8f9_Airtable.svg",
    },
    {
      id: "gsap",
      name: "GSAP",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7010b43e3ef2e1b3b_Gsap.svg",
    },
    {
      id: "three",
      name: "Three.js",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7868c5454813d8bae_ThreeJS.svg",
    },
    {
      id: "notion",
      name: "Notion",
      logo: "https://cdn.prod.website-files.com/66dc629ccfc48ed5e3d320d0/66df1cc7216259e47281b5f1_Notion.svg",
    },
  ];

  const insertTechStack = (techName: string) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart || 0;
      const currentText = techStackText || PLACEHOLDER;

      const insertPosition =
        cursorPosition <= PLACEHOLDER.length
          ? currentText.length
          : cursorPosition;

      const beforeCursor = currentText.slice(0, insertPosition);
      const afterCursor = currentText.slice(insertPosition);

      const separator =
        beforeCursor.trim().length > PLACEHOLDER.length &&
        !beforeCursor.trim().endsWith(",")
          ? ", "
          : "";

      const newText = beforeCursor + separator + techName + afterCursor;
      onTechStackChange(newText);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition =
            insertPosition + techName.length + separator.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (!newText.startsWith(PLACEHOLDER)) {
      return;
    }
    onTechStackChange(newText);
  };

  return (
    <div className="flex flex-col bg-white rounded-lg border border-solid shadow-xl border-slate-300 w-[400px]">
      <TopHeading title="What tech stack are you using?" />
      <textarea
        ref={textareaRef}
        value={techStackText}
        onChange={handleTextChange}
        placeholder="The tech stack includes"
        className="p-4 border-white w-full h-[220px] focus:outline-none resize-none"
        style={{
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
        }}
        onKeyDown={(e) => {
          if (
            e.key === "Backspace" &&
            textareaRef.current &&
            textareaRef.current.selectionStart <= PLACEHOLDER.length
          ) {
            e.preventDefault();
          }
        }}
      />
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2 mb-4">
          {techStacks.map((tech) => (
            <button
              key={tech.id}
              onClick={() => insertTechStack(tech.name)}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <img src={tech.logo} alt={tech.name} className="w-4 h-4 mr-2" />
              <span className="text-sm text-gray-700">{tech.name}</span>
            </button>
          ))}
        </div>
      </div>
      <FormFooter onNext={onNext} onBack={onBack} />
    </div>
  );
};

export default SecondStage;
