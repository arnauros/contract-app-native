import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// Simple in-memory cache
const cache = new Map();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the contract from cache if it exists
    if (cache.has(params.id)) {
      return NextResponse.json({ text: cache.get(params.id) });
    }

    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    // Check cache
    const cacheKey = prompt;
    if (cache.has(cacheKey)) {
      return NextResponse.json({ text: cache.get(cacheKey) });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
${prompt}

Important: Ensure no text duplication and maintain professional formatting.`,
        },
      ],
    });

    // Clean up the response text
    let text = completion.choices[0].message.content;
    text = text
      .replace(/\[\[.*?\]\]/g, "") // Remove double brackets
      .replace(/\s+/g, " ") // Remove extra spaces
      .replace(/(\w+)\s+\1/g, "$1"); // Remove consecutive duplicate words

    // Cache the result
    cache.set(cacheKey, text);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}
