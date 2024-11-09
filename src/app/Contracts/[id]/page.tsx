"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { ContractEditor } from "@/app/Components/Editor/ContractEditor";
import Skeleton from "@/app/Components/Editor/skeleton";

export default function ContractPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    const loadContract = async () => {
      try {
        hasInitialized.current = true;
        console.log("🔄 Loading contract once:", id);

        const savedData = localStorage.getItem(`contract-${id}`);
        if (!savedData) {
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);

        // Only generate if we have data and haven't generated yet
        if (
          (parsedData.projectBrief || parsedData.techStack) &&
          !generatedContent
        ) {
          const response = await fetch("/api/generateContract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedData),
          });

          if (response.ok) {
            const generated = await response.json();
            setGeneratedContent(generated);
          }
        }
      } catch (error) {
        console.error("Loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, []); // Empty dependency array

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="p-4">
      <ContractEditor formData={formData} initialContent={generatedContent} />
    </div>
  );
}
