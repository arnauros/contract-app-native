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
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    const loadContract = async () => {
      try {
        hasInitialized.current = true;
        console.log("🔄 Loading contract once:", id);

        // First try to load the generated contract
        const savedContract = localStorage.getItem(`contract-content-${id}`);
        if (savedContract) {
          console.log("📄 Found saved contract, loading...");
          setGeneratedContent(JSON.parse(savedContract));
          setIsLoading(false);
          return;
        }

        // If no saved contract, load form data and generate new contract
        const savedData = localStorage.getItem(`contract-${id}`);
        if (!savedData) {
          setIsLoading(false);
          return;
        }

        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);

        // Only generate if we have data and no saved contract
        if (parsedData.projectBrief || parsedData.techStack) {
          const response = await fetch("/api/generateContract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsedData),
          });

          if (response.ok) {
            const generated = await response.json();
            // Save the generated contract
            localStorage.setItem(
              `contract-content-${id}`,
              JSON.stringify(generated)
            );
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
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ContractEditor formData={formData} initialContent={generatedContent} />
    </div>
  );
}
