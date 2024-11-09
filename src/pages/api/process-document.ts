import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
    });

    const response = completion.choices[0].message.content;
    const [categoryLine, summaryLine] = response.split("\n");
    const category = categoryLine.split(": ")[1].toLowerCase();
    const summary = summaryLine.split(": ")[1];

    return res.status(200).json({
      summary,
      type: category,
    });
  } catch (error) {
    console.error("🔴 API Route Error:", error);
    return res.status(500).json({
      error: "Failed to process document",
      details: error.message,
    });
  }
}
