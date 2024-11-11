import { OpenAI } from "openai";
import { NextResponse } from "next/server";

interface AuditIssue {
  type: "spelling" | "rewording" | "upsell" | "general";
  text: string;
  suggestion?: string;
  position: {
    blockIndex: number;
    start: number;
    end: number;
  };
}

interface AuditResponse {
  issues: AuditIssue[];
  summary: {
    total: number;
    rewordings: number;
    spelling: number;
    upsell: number;
  };
}

export async function POST(request: Request) {
  const { blocks } = await request.json();
  const openai = new OpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a contract auditing assistant. Analyze the contract for spelling errors, unclear language, potential upsell opportunities, and general issues. Return the findings in a structured format.",
        },
        {
          role: "user",
          content: JSON.stringify(blocks),
        },
      ],
    });

    // Process and structure the response
    const auditResults: AuditResponse = {
      issues: [], // Parse AI response into structured issues
      summary: {
        total: 0,
        rewordings: 0,
        spelling: 0,
        upsell: 0,
      },
    };

    return NextResponse.json(auditResults);
  } catch (error) {
    console.error("Contract audit failed:", error);
    return NextResponse.error();
  }
}
