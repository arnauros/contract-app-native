import { OpenAI } from "openai";
import { NextResponse } from "next/server";

interface AuditIssue {
  type: "Enhancement" | "Protection" | "Clarity" | "Communication";
  text: string;
  suggestion: string;
  section:
    | "Payment"
    | "Timeline"
    | "Scope"
    | "Terms"
    | "General"
    | "Confidentiality";
  highlightType: "block" | "word";
  targetText: string;
  position?: {
    blockIndex: number;
    start: number;
    end: number;
  };
}

interface AuditResponse {
  issues: AuditIssue[];
  summary: {
    total: number;
    enhancements: number;
    protections: number;
    clarities: number;
    communications: number;
  };
}

// Add new types for grouped issues
interface GroupedIssue extends AuditIssue {
  count: number;
}

type BlockIssues = { [key: number]: GroupedIssue[] };

const findBlockIndex = (
  blocks: any[],
  section: string,
  targetText?: string
): number => {
  if (!blocks?.length) return -1;

  // First try to find by exact text if provided
  if (targetText) {
    const exactMatch = blocks.findIndex((block) => {
      const blockText = block.data?.text || "";
      const hasMatch = blockText
        .toLowerCase()
        .includes(targetText.toLowerCase());
      return hasMatch && blockText.trim().length > 0;
    });

    if (exactMatch >= 0) return exactMatch;
  }

  // Then try to find by section header
  const sectionMatch = blocks.findIndex((block) => {
    const isHeader = block.type === "header";
    const text = (block.data?.text || "").toLowerCase();
    const sectionLower = section.toLowerCase();
    return isHeader && text.includes(sectionLower);
  });

  // Return the next block after the section header if found, or -1 if not found
  return sectionMatch >= 0 ? sectionMatch + 1 : -1;
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  const { blocks } = await request.json();
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the contract and provide professional enhancement suggestions. For each suggestion:
          1. Focus on positive improvements that make the contract stronger or more client-friendly
          2. Frame suggestions as opportunities for enhancement, not problems to fix
          3. Keep suggestions friendly and casual, 1-2 sentences max
          4. Focus on clarity, protection, or improved client communication
          5. Base suggestions on real freelancer experiences and best practices
          6. If the contract is already good, just say "No issues found"
          7. If the contract needs improvements, suggest changes that are easy to implement and will help both parties
          8. Keep suggestion titles concise (1-3 words)
          
          Categorize suggestions into these types:
          - Enhancement: General improvements to strengthen the contract
          - Protection: Legal safeguards and risk mitigation
          - Clarity: Making terms and expectations clearer
          - Communication: Client interaction and project management
          
          Example topics:
          - Late payment protection
          - Clear cancellation terms
          - GDPR compliance
          - Scope management
          - Deliverable ownership
          - Client responsibilities
          - Communication expectations
          - Revision policies
          - Intellectual property rights
          - Payment milestones
          
          Return in JSON format:
          {
            "issues": [
              {
                "type": "Enhancement"|"Protection"|"Clarity"|"Communication",
                "text": "Friendly suggestion for improvement",
                "suggestion": "Specific enhancement to consider",
                "section": "Payment"|"Timeline"|"Scope"|"Terms"|"General"|"Confidentiality",
                "highlightType": "block"|"word",
                "targetText": "exact text to highlight"
              }
            ]
          }`,
        },
        {
          role: "user",
          content: JSON.stringify(blocks),
        },
      ],
      response_format: { type: "json_object" },
    });

    if (!completion.choices[0].message.content) {
      throw new Error("No content in response");
    }

    const analysis = JSON.parse(completion.choices[0].message.content);

    const mappedIssues = analysis.issues.map((issue: AuditIssue) => ({
      ...issue,
      count: 1,
      position: {
        blockIndex: findBlockIndex(blocks, issue.section, issue.targetText),
        start: 0,
        end: 0,
      },
    }));

    // Group issues by blockIndex
    const groupedIssues: BlockIssues = mappedIssues.reduce(
      (acc: BlockIssues, issue: GroupedIssue) => {
        const blockIndex = issue.position?.blockIndex || 0;
        if (!acc[blockIndex]) {
          acc[blockIndex] = [];
        }
        acc[blockIndex].push(issue);
        return acc;
      },
      {}
    );

    return NextResponse.json({
      issues: mappedIssues,
      groupedIssues,
      summary: {
        total: mappedIssues.length,
        enhancements: mappedIssues.filter(
          (i: GroupedIssue) => i.type.toLowerCase() === "enhancement"
        ).length,
        protections: mappedIssues.filter(
          (i: GroupedIssue) => i.type.toLowerCase() === "protection"
        ).length,
        clarities: mappedIssues.filter(
          (i: GroupedIssue) => i.type.toLowerCase() === "clarity"
        ).length,
        communications: mappedIssues.filter(
          (i: GroupedIssue) => i.type.toLowerCase() === "communication"
        ).length,
      },
    });
  } catch (error) {
    console.error("Contract audit failed:", error);
    return NextResponse.json(
      { error: "Failed to analyze contract" },
      { status: 500 }
    );
  }
}
