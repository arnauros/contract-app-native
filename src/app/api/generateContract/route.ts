import { NextResponse } from "next/server";
import OpenAI from "openai";

interface EditorJSBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
    style?: string;
    items?: string[];
  };
}

// Initialize OpenAI with error handling
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(request: Request) {
  try {
    // Log environment variables (without exposing the full API key)
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(
      "API Key configured:",
      apiKey ? `${apiKey.slice(0, 7)}...` : "missing"
    );

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const data = await request.json();
    console.log("Received data for contract generation:", data);

    try {
      // Create a base prompt that works even with minimal data
      const projectInfo = data.projectBrief
        ? `Project: ${data.projectBrief}\n`
        : "";
      const techInfo = data.techStack
        ? `Technical Scope: ${data.techStack}\n`
        : "";
      const timelineInfo =
        data.startDate || data.endDate
          ? `Timeline: ${data.startDate || "TBD"} to ${data.endDate || "TBD"}\n`
          : "";
      const pdfInfo = data.pdf ? `PDF: ${data.pdf}\n` : "";

      // Add file summaries to context
      const attachmentSummaries = data.attachments
        ?.filter((att: any) => att.summary)
        .map((att: any) => `Document "${att.name}": ${att.summary}`)
        .join("\n");

      const documentContext = attachmentSummaries
        ? `\nAdditional Context from Uploaded Documents:\n${attachmentSummaries}\n`
        : "";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Generate a professional Contract. Format each section with a clear header. Use any provided document summaries to enhance and customize the contract content.",
          },
          {
            role: "user",
            content: `Create a contract with the following details:
              ${projectInfo}${techInfo}${timelineInfo}${pdfInfo}${documentContext}
              
              ${
                data.techStack
                  ? `This contract is for a client that specializes in ${data.techStack}, in the Design/Development/NoCode Designer space.`
                  : "This contract is for a design/development project in the tech space."
              }
              
              Use industry standard information to make it accurate and comprehensive.
              
              If pricing is not provided, use the average pricing for the industry as a fixed price.
              If timeline is not provided, use the average timeline for the industry.
              Mark any suggested values with **(Suggested)**.
              If the stack is mentioned, make sure to include it in the contract and use a few words to describe it.
              Make it as extensive as possible to protect both parties, while keeping it concise.

              If you have to bunch multiple h2's together make it a callout block with a list inside like this:
                ### Timeline
                The project is expected to follow this timeline:

                Project Discovery and Requirements Gathering: 1 week
                Prototyping and Initial Design: 2 weeks
                Development Phase: 4 weeks
                Testing and Revisions: 2 weeks
                Final Review and Launch: 1 week.
              
              Format with the following sections (add more if needed) if you create a section make it an h2:
              1. Title
              2. Project Brief
              3. Tech Stack
              4. Timeline
              5. Payment Terms
              6. Confidentiality
              7. Termination

              For the timeline, create realistic milestones based on the project scope.
              If you create a timeline, make it under Timeline section and make it a list of milestones in h3.

              Add any sections needed for the specific type of project (design assets, code ownership, etc.).

              Use clear headings for sections, usually one or two words unless it's the contract title.
              
              Do not include signatures or dates.
              Never use separator lines (---) or ALL CAPS.`,
          },
        ],
        temperature: 0.7,
      });

      console.log("OpenAI API Response:", completion);

      if (!completion.choices[0].message.content) {
        throw new Error("No content generated");
      }

      console.log(
        "Generated contract text:",
        completion.choices[0].message.content
      );

      const contractText = completion.choices[0].message.content;

      // Convert the response into EditorJS blocks
      const lines = contractText.split("\n").filter((line) => line.trim());
      const blocks: EditorJSBlock[] = [];

      lines.forEach((line) => {
        const cleanLine = line.replace(/\*\*/g, "").replace(/#/g, "").trim();

        // First line is always H1 title
        if (blocks.length === 0) {
          blocks.push({
            type: "header",
            data: {
              text: cleanLine,
              level: 1,
            },
          });
        }
        // Section headers
        else if (line.match(/^(\d+\.|##|#)\s+/)) {
          blocks.push({
            type: "header",
            data: {
              text: cleanLine.replace(/^\d+\.\s*/, ""),
              level: 2,
            },
          });
        }
        // Bullet points
        else if (line.match(/^\s*-\s+/)) {
          blocks.push({
            type: "list",
            data: {
              style: "unordered",
              items: [cleanLine.replace(/^\s*-\s+/, "")],
            },
          });
        }
        // Regular paragraphs
        else {
          blocks.push({
            type: "paragraph",
            data: {
              text: cleanLine,
            },
          });
        }
      });

      console.log("Generated blocks:", blocks);

      return NextResponse.json({ blocks });
    } catch (openaiError: any) {
      console.error("OpenAI API Error:", openaiError);
      throw new Error(`OpenAI API Error: ${openaiError.message}`);
    }
  } catch (error) {
    console.error("Contract generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate contract",
      },
      { status: 500 }
    );
  }
}
