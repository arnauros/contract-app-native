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

// Simple in-memory cache for development (use Redis in production)
const cache = new Map<string, any>();

// Function to extract client details and payment terms from contract text
function extractContractData(contractText: string) {
  const extracted = {
    clientName: "",
    clientEmail: "",
    clientCompany: "",
    paymentTerms: "",
    totalAmount: "",
    currency: "USD",
  };

  // Extract client name (look for patterns like "Client:", "Company:", "Client Name:")
  const clientNameMatch = contractText.match(
    /(?:Client|Company|Client Name)[:\s]+([^\n\r,]+)/i
  );
  if (clientNameMatch) {
    extracted.clientName = clientNameMatch[1].trim();
  }

  // Extract client email
  const emailMatch = contractText.match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  if (emailMatch) {
    extracted.clientEmail = emailMatch[1];
  }

  // Extract client company (look for patterns like "Company:", "Organization:")
  const companyMatch = contractText.match(
    /(?:Company|Organization|Corporation)[:\s]+([^\n\r,]+)/i
  );
  if (companyMatch) {
    extracted.clientCompany = companyMatch[1].trim();
  }

  // Extract payment terms (look for patterns like "Payment Terms:", "Payment Schedule:")
  const paymentMatch = contractText.match(
    /(?:Payment Terms|Payment Schedule)[:\s]+([^\n\r]+(?:\n[^\n\r]+)*?)(?=\n\n|\n[A-Z]|$)/i
  );
  if (paymentMatch) {
    extracted.paymentTerms = paymentMatch[1].trim();
  }

  // Extract total amount (look for patterns like "$50,000", "Total: $5000", "Budget: $10000")
  const amountMatch = contractText.match(
    /(?:Total|Budget|Amount)[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i
  );
  if (amountMatch) {
    extracted.totalAmount = amountMatch[1].replace(/,/g, "");
  }

  // Extract currency
  const currencyMatch = contractText.match(/\$([0-9,]+)/);
  if (currencyMatch) {
    extracted.currency = "USD";
  }

  return extracted;
}

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

    // Create cache key based on input data (include names + summaries + pdf to avoid stale hits)
    const cacheKey = JSON.stringify({
      projectBrief: data.projectBrief || "",
      techStack: data.techStack || "",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      pdf: data.pdf || "",
      attachments: (data.attachments || [])
        .map((att: any) => `${att.name || "unknown"}:${att.summary || ""}`)
        .join("|"),
    });

    // Check cache first (skip when debug flag is set)
    if (!data?.debug && cache.has(cacheKey)) {
      console.log("Cache hit - returning cached contract");
      return NextResponse.json(cache.get(cacheKey));
    }

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
    const budgetInfo =
      typeof data.budget !== "undefined" && String(data.budget).trim() !== ""
        ? `Budget: ${data.budget}\n`
        : "";

    // Add file summaries to context
    // Prefer real summaries over MOCK_DEBUG when both present
    const realSummaries = (data.attachments || []).filter(
      (att: any) => att.summary && att.name !== "MOCK_DEBUG"
    );
    const attachmentSummaries = realSummaries
      .map((att: any) => `Document "${att.name}": ${att.summary}`)
      .join("\n");

    const documentContext = attachmentSummaries
      ? `\nAdditional Context from Uploaded Documents:\n${attachmentSummaries}\n`
      : "";
    console.log(
      "Document summaries provided:",
      (data.attachments || []).filter((a: any) => !!a?.summary).length
    );

    // If debug flag is set, inject an obvious marker into the prompt
    const debugBanner = data.debug
      ? "\n[DEBUG MODE] Inputs were applied to this contract.\n"
      : "";

    // Determine a primary document label (filename without extension) for title fallback/reference
    const primaryAttachment = (data.attachments || []).find(
      (att: any) => att?.name && att?.name !== "MOCK_DEBUG"
    );
    const primaryDocLabel = primaryAttachment
      ? String(primaryAttachment.name).replace(/\.[^/.]+$/, "")
      : "";

    try {
      // Use a faster model and add timeout (longer to accommodate PDF-based context)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a senior contracts specialist. Always ground the contract in the provided 'Additional Context' from documents. Prefer provided context over assumptions.",
            },
            {
              role: "user",
              content: `Create a contract with the following details. The 'Additional Context' lines are authoritative; you MUST reflect their specifics (names, brands, scope, dates, budget) throughout the contract where relevant.
              ${projectInfo}${techInfo}${timelineInfo}${budgetInfo}${pdfInfo}${documentContext}
              ${debugBanner}

              ${
                data.techStack
                  ? `This contract is for a client that specializes in ${data.techStack}, in the Design/Development/NoCode Designer space.`
                  : "This contract is for a design/development project in the tech space."
              }

              Requirements:
              - The FIRST LINE MUST BE the actual contract title (e.g., "Website Development Contract for Coca-Cola Company").
              - Do NOT include a section header literally named "Title".
              - Base Project Brief and Tech Stack sections on the Additional Context when provided.
              - If brand or company names appear (e.g., Coca-Cola), use them exactly.
              - If pricing/timeline are missing, use reasonable suggested values and mark them with **(Suggested)**. If a Budget is provided, ensure Payment Terms and totals align with it.
              - Keep content concise but protective for both parties.

              If you need to group multiple subsections under a header, use a callout-like list format, for example under Timeline:
                ### Timeline
                The project is expected to follow this timeline:
                Project Discovery and Requirements Gathering: 1 week
                Prototyping and Initial Design: 2 weeks
                Development Phase: 4 weeks
                Testing and Revisions: 2 weeks
                Final Review and Launch: 1 week.

              Section outline (add more as needed; h2 for section headers):
              1. Title
              2. Project Brief
              3. Tech Stack
              4. Timeline
              5. Payment Terms
              6. Confidentiality
              7. Termination

              Use clear headings (short labels). Do not include signatures or dates. Never use separator lines (---) or ALL CAPS.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

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
      const rawLines = contractText.split("\n").filter((line) => line.trim());
      const blocks: EditorJSBlock[] = [];

      rawLines.forEach((line, index) => {
        const cleanLine = line.replace(/\*\*/g, "").replace(/#/g, "").trim();

        // First non-empty line becomes H1 title
        if (blocks.length === 0) {
          let title =
            cleanLine.toLowerCase() === "title" && rawLines[index + 1]
              ? rawLines[index + 1]
                  .replace(/\*\*/g, "")
                  .replace(/#/g, "")
                  .trim()
              : cleanLine;

          // Normalize title: remove subtitles after dash/colon, trim length, and ensure it references the input document when present
          title = title
            .split(":")[0]
            .replace(/[–—-].*$/, "")
            .trim();
          if (title.length > 80) {
            title = title.slice(0, 80).trim();
          }
          if (
            primaryDocLabel &&
            !new RegExp(
              primaryDocLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "i"
            ).test(title)
          ) {
            title = `Contract for ${primaryDocLabel}`;
          }

          blocks.push({
            type: "header",
            data: { text: title, level: 1 },
          });
          return;
        }

        // Skip a literal "Title" line that sometimes follows
        if (cleanLine.toLowerCase() === "title") {
          return;
        }

        // Section headers
        if (line.match(/^(\d+\.|##|#)\s+/)) {
          blocks.push({
            type: "header",
            data: { text: cleanLine.replace(/^\d+\.\s*/, ""), level: 2 },
          });
          return;
        }

        // Bullet points
        if (line.match(/^\s*-\s+/)) {
          blocks.push({
            type: "list",
            data: {
              style: "unordered",
              items: [cleanLine.replace(/^\s*-\s+/, "")],
            },
          });
          return;
        }

        // Regular paragraphs
        blocks.push({ type: "paragraph", data: { text: cleanLine } });
      });

      console.log("Generated blocks:", blocks);

      // Extract client details and payment terms from the generated contract
      const extractedData = extractContractData(contractText);
      console.log("📋 Extracted contract data:", extractedData);

      const result = {
        blocks,
        extractedData, // Include extracted data in the response
      };

      // Cache the result (skip when debug flag is set)
      if (!data?.debug) {
        cache.set(cacheKey, result);
      }

      // Limit cache size
      if (cache.size > 50) {
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }

      return NextResponse.json(result);
    } catch (openaiError: any) {
      console.error("OpenAI API Error:", openaiError);

      // If it's a timeout error, provide a fallback
      if (openaiError.name === "AbortError") {
        // One quick retry with shorter token limit before falling back
        try {
          console.log(
            "OpenAI request timed out; retrying once with reduced tokens"
          );
          const retry = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a senior contracts specialist. Always ground the contract in the provided 'Additional Context' from documents.",
              },
              {
                role: "user",
                content: `${projectInfo}${techInfo}${timelineInfo}${pdfInfo}${documentContext}\n${debugBanner}\nGenerate a concise but complete contract using the context above.`,
              },
            ],
            temperature: 0.6,
            max_tokens: 1200,
          });

          const content = retry.choices[0]?.message?.content;
          if (content) {
            const lines = content.split("\n").filter((line) => line.trim());
            const blocks: EditorJSBlock[] = [];
            lines.forEach((line) => {
              const cleanLine = line
                .replace(/\*\*/g, "")
                .replace(/#/g, "")
                .trim();
              if (blocks.length === 0) {
                // Normalize title as above and reference primary document when present
                let title = cleanLine;
                title = title
                  .split(":")[0]
                  .replace(/[–—-].*$/, "")
                  .trim();
                if (title.length > 80) {
                  title = title.slice(0, 80).trim();
                }
                if (
                  primaryDocLabel &&
                  !new RegExp(
                    primaryDocLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "i"
                  ).test(title)
                ) {
                  title = `Contract for ${primaryDocLabel}`;
                }
                blocks.push({
                  type: "header",
                  data: { text: title, level: 1 },
                });
              } else if (line.match(/^(\d+\.|##|#)\s+/)) {
                blocks.push({
                  type: "header",
                  data: { text: cleanLine.replace(/^\d+\.\s*/, ""), level: 2 },
                });
              } else if (line.match(/^\s*-\s+/)) {
                blocks.push({
                  type: "list",
                  data: {
                    style: "unordered",
                    items: [cleanLine.replace(/^\s*-\s+/, "")],
                  },
                });
              } else {
                blocks.push({ type: "paragraph", data: { text: cleanLine } });
              }
            });
            return NextResponse.json({ blocks });
          }
        } catch (retryError) {
          console.log("Retry failed, returning fallback contract");
        }

        console.log("OpenAI request timed out, using fallback contract");
        return NextResponse.json({
          blocks: [
            { type: "header", data: { text: "Contract Agreement", level: 1 } },
            {
              type: "paragraph",
              data: {
                text: "This is a fallback contract template. Please try again or contact support if the issue persists.",
              },
            },
          ],
        });
      }

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
