import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { originalText, suggestion, type, context } = await request.json();

    if (!originalText || !suggestion) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are a contract writing assistant. Improve the following text based on the suggestion provided.

Original text: "${originalText}"
Suggestion: ${suggestion}
Type: ${type}
Context: "${context}"

Please provide an improved version of the original text that addresses the suggestion. Keep the meaning and intent the same, but make it clearer, more professional, or better structured as suggested. Return only the improved text, no explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a professional contract writing assistant. Provide clear, concise improvements to contract text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
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
