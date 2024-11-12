import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a professional Contract. Format each section with a clear header.",
        },
        {
          role: "user",
          content: `Create a contract for:
            Project: ${data.projectBrief}
            Technical Scope: ${data.techStack}
            Timeline: ${data.startDate || "TBD"} to ${data.endDate || "TBD"}
            PDF: ${data.pdf || "TBD"}
            
            Imagine you are a lawyer and you are writing a contract for a client that specializes in ${
              data.techStack
            }, and is in the Design/Development/NoCode Designer space. 
            
            Use the details of the project and use online information to make it more accurate. 
            
            If the user does NOT provide pricing, use the average pricing for the industry as a fixed price, and if the user doesn't provide a timeline, use the average timeline for the industry, again with bolded text and in brackets with **(Suggested)**. If the user does provide pricing, use that instead.
            
            Always use best practices for the industry. Make it as extensive as possible to protect the designer, without being too long. 

            Explain what the tech stack is used for, and what the project is about.

            Make sure you include all the sections and information that are provided. Always make sure the title is something related to the inputs if there are any.
            
            Make sure the format is as follows and uses headings for sections:
            1. Title
            2. Project Brief
            3. Tech Stack
            4. Timeline
            5. Payment Terms
            6. Confidentiality
            7. Termination

            Add any sections needed for the project that relate to the industry and stack. If its a design project, suggest a section for design assets. If its a development project, suggest a section for code, etc.

            Only use headings for section titles, usually one or two words unless its the title of the contract.
            
            Do not include signatures or dates.
            
            Never add in a line like this ---. Never end with a line after ---. Never use ALL CAPS.`,
        },
      ],
      temperature: 0.7,
    });

    const contractText = completion.choices[0].message.content;

    // Convert the response into EditorJS blocks
    const lines = contractText.split("\n").filter((line) => line.trim());
    const blocks = [];

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

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Contract generation failed:", error);
    return NextResponse.json({
      blocks: [
        {
          type: "header",
          data: {
            text: "Error Generating Contract",
            level: 1,
          },
        },
        {
          type: "paragraph",
          data: {
            text: "Failed to generate contract. Please try again.",
          },
        },
      ],
    });
  }
}
