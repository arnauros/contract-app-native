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

// Add new types for grouped issues
interface GroupedIssue extends AuditIssue {
  count: number;
}

interface BlockIssues {
  [blockIndex: number]: GroupedIssue[];
}

const findBlockIndex = (
  blocks: any[],
  section: string,
  targetText?: string
): number => {
  console.log("Finding block for section:", section, "targetText:", targetText); // Debug log

  // First try to find by exact text if provided
  if (targetText) {
    const exactMatch = blocks.findIndex((block) => {
      const blockText = block.data?.text || "";
      const hasMatch = blockText
        .toLowerCase()
        .includes(targetText.toLowerCase());
      console.log("Checking block:", blockText, "hasMatch:", hasMatch); // Debug log
      return hasMatch;
    });

    if (exactMatch !== -1) {
      console.log("Found exact match at index:", exactMatch); // Debug log
      return exactMatch;
    }
  }

  // Then try to find by section header
  const sectionMatch = blocks.findIndex((block) => {
    const isHeader = block.type === "header";
    const text = (block.data?.text || "").toLowerCase();
    const isMatch = isHeader && text.includes(section.toLowerCase());
    console.log("Checking header:", text, "isMatch:", isMatch); // Debug log
    return isMatch;
  });

  console.log("Final block index:", sectionMatch); // Debug log
  return sectionMatch;
};

export async function POST(request: Request) {
  const { blocks } = await request.json();
  const openai = new OpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the contract and provide specific suggestions. For each issue:
          1. Identify the exact section and text that needs improvement
          2. Explain why it needs improvement
          3. Provide a specific suggestion for improvement, without sounding like a dickhead lawyer, more like a lawyer suggestion. Try to not repeat the same text.
          
          Return in JSON format:
          {
            "issues": [
              {
                "type": "rewording"|"spelling"|"upsell"|"general",
                "text": "Description of the issue",
                "suggestion": "Specific suggestion",
                "section": "payment"|"timeline"|"scope"|"terms"|"general",
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

    const analysis = JSON.parse(completion.choices[0].message.content);

    const mappedIssues = analysis.issues.map((issue: any) => ({
      ...issue,
      position: {
        blockIndex: findBlockIndex(blocks, issue.section, issue.targetText),
        start: 0, // You might want to implement more precise text matching
        end: 0,
      },
    }));

    // Group issues by blockIndex
    const groupedIssues: BlockIssues = mappedIssues.reduce(
      (acc: BlockIssues, issue: AuditIssue) => {
        const blockIndex = issue.position.blockIndex;
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
        rewordings: mappedIssues.filter((i) => i.type === "rewording").length,
        spelling: mappedIssues.filter((i) => i.type === "spelling").length,
        upsell: mappedIssues.filter((i) => i.type === "upsell").length,
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
