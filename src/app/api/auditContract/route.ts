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
          content: `You are a contract optimization expert. Always find opportunities for improvement in these key areas:
          1. Clarity & Precision: Suggest clearer wording even if the original is acceptable
          2. Professional Tone: Enhance formal language
          3. Upsell Opportunities: Identify where additional services could be offered
          4. Risk Management: Suggest additional clauses or specifications
          5. Industry Best Practices: Recommend modern contract standards
          
          Always provide at least 3-5 suggestions, even for well-written contracts.
          Focus on constructive improvements rather than critical fixes.`,
        },
        {
          role: "user",
          content: JSON.stringify(blocks),
        },
      ],
    });

    // Parse the response and structure it
    const analysis = completion.choices[0].message.content;

    // For demo purposes, always return some suggestions
    const auditResults: AuditResponse = {
      issues: [
        {
          type: "rewording",
          text: "Project Brief section could be more specific about deliverables",
          suggestion: "Add specific metrics and success criteria",
          position: { blockIndex: 1, start: 0, end: 100 },
        },
        {
          type: "upsell",
          text: "Consider adding maintenance and support services",
          suggestion: "Offer post-launch support package",
          position: { blockIndex: 2, start: 0, end: 50 },
        },
        {
          type: "general",
          text: "Timeline section could include more milestones",
          suggestion: "Add specific checkpoint dates",
          position: { blockIndex: 3, start: 0, end: 75 },
        },
      ],
      summary: {
        total: 3,
        rewordings: 1,
        spelling: 0,
        upsell: 1,
      },
    };

    return NextResponse.json(auditResults);
  } catch (error) {
    console.error("Contract audit failed:", error);
    return NextResponse.error();
  }
}
