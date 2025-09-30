import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { originalText, suggestion, type, context, fullContract } =
      await request.json();

    if (!originalText || !suggestion) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are a professional contract writing assistant. You need to make a MINIMAL, targeted improvement to contract text.

FULL CONTRACT CONTEXT:
${fullContract || context}

TARGET TEXT TO IMPROVE:
"${originalText}"

SUGGESTION:
${suggestion}

IMPORTANT INSTRUCTIONS:
1. ONLY modify the target text above - do NOT change any other parts of the contract
2. Make MINIMAL changes - add only what's truly needed to address the suggestion
3. Keep the same tone, style, and structure as the original
4. Do NOT rewrite the entire sentence unless absolutely necessary
5. Focus on adding clarity, protection, or communication improvements
6. Return ONLY the improved version of the target text, nothing else

Examples:
- If suggestion is "add late payment clause", add: "with late payment penalties of 1.5% per month"
- If suggestion is "clarify timeline", add: "with specific milestones and dates"
- If suggestion is "add communication clause", add: "with weekly progress updates"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional contract writing assistant. Make minimal, targeted improvements to contract text while preserving the original structure and tone.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.2,
    });

    const improvedText = completion.choices[0]?.message?.content?.trim();

    if (!improvedText) {
      throw new Error("No response from OpenAI");
    }

    return NextResponse.json({ improvedText });
  } catch (error) {
    console.error("Error improving text:", error);
    return NextResponse.json(
      { error: "Failed to improve text" },
      { status: 500 }
    );
  }
}
