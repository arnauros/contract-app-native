"use client";

import { ContractEditor } from "@/app/Components/Editor/ContractEditor";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function ContractPage() {
  const { id } = useParams();
  const [formData, setFormData] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateContract = async (data: any) => {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You are a professional contract generator. Create clear, concise contracts without repetition. Use proper formatting and clear section breaks.",
            },
            {
              role: "user",
              content: `Create a professional contract with the following structure:

1. Title and Parties
2. Project Scope
3. Timeline
4. Payment Terms
5. Technical Specifications
6. Terms and Conditions
7. Signatures

Use this information:
- Project Brief: ${data.projectBrief}
- Tech Stack: ${data.techStack}
- Timeline: ${data.startDate} to ${data.endDate}

Important: Format as EditorJS blocks and ensure no text duplication and maintain professional formatting.
Return as valid JSON with 'blocks' array.`,
            },
          ],
        });

        const content = completion.choices[0].message.content;
        const cleanedContent = content
          .replace(/\[\[.*?\]\]/g, "") // Remove double brackets
          .replace(/\s+/g, " ") // Remove extra spaces
          .replace(/(\w+)\s+\1/g, "$1"); // Remove consecutive duplicate words

        return JSON.parse(cleanedContent);
      } catch (err) {
        console.error("Contract generation failed:", err);
        throw err;
      }
    };

    const loadContract = async () => {
      try {
        const savedData = localStorage.getItem(`contract_${id}`);
        if (!savedData) {
          throw new Error("No contract data found");
        }

        const parsed = JSON.parse(savedData);
        setFormData(parsed);

        // Generate contract content
        const generatedBlocks = await generateContract(parsed);
        setGeneratedContent(generatedBlocks);
      } catch (err) {
        console.error("Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate contract"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <ContractEditor formData={null} initialContent={null} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <ContractEditor formData={formData} initialContent={generatedContent} />
    </div>
  );
}
