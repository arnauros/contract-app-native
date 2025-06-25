import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
// @ts-ignore
import PDFParser from "pdf-parse";

console.log("🟢 API Module: Initializing process-document endpoint");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import { promises as fs } from "fs";

// Simple cache for file processing
const fileCache = new Map<string, any>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🟢 API Route: Request received");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({});

    const [fields, files] = await form.parse(req);
    console.log("🟢 API Route: Form parsed", { fields, files });

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("🟢 API Route: Processing file:", file.originalFilename);

    // Create cache key based on file name and size
    const cacheKey = `${file.originalFilename}-${file.size}`;

    // Check cache first
    if (fileCache.has(cacheKey)) {
      console.log("Cache hit - returning cached file analysis");
      return res.status(200).json(fileCache.get(cacheKey));
    }

    const fileContent = await fs.readFile(file.filepath);
    let textContent = "";

    if (file.mimetype === "application/pdf") {
      const pdfData = await PDFParser(fileContent);
      textContent = pdfData.text;
    } else {
      textContent = fileContent.toString();
    }

    console.log(
      "🟢 API Route: File content extracted, length:",
      textContent.length
    );

    // Add timeout for OpenAI request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini", // Back to original model
        messages: [
          {
            role: "system",
            content: `Analyze the following document and provide a brief summary. 
          Also identify if this document primarily contains:
          - Project brief/scope information
          - Technical stack details
          - Timeline/scheduling information
          - Payment terms or financial details
          
          Format your response as:
          Category: [brief|techStack|timeline|paymentTerms]
          Summary: [2-3 sentence summary]`,
          },
          {
            role: "user",
            content: textContent.slice(0, 4000),
          },
        ],
        temperature: 0.5,
        max_tokens: 150,
      },
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const [categoryLine, summaryLine] = response.split("\n");
    const category = categoryLine.split(": ")[1]?.toLowerCase() || "brief";
    const summary =
      summaryLine.split(": ")[1] || "Document analyzed successfully.";

    const result = {
      summary,
      type: category,
    };

    // Cache the result
    fileCache.set(cacheKey, result);

    // Limit cache size
    if (fileCache.size > 100) {
      const firstKey = fileCache.keys().next().value;
      if (firstKey) {
        fileCache.delete(firstKey);
      }
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("🔴 API Route Error:", error);

    // If it's a timeout error, provide a fallback
    if (error.name === "AbortError") {
      console.log("File processing timed out, using fallback analysis");
      return res.status(200).json({
        summary: "Document analysis timed out. Please try again.",
        type: "brief",
      });
    }

    return res.status(500).json({
      error: "Failed to process document",
      details: error.message,
    });
  }
}
