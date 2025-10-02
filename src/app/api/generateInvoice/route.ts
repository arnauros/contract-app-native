import { NextResponse } from "next/server";
import OpenAI from "openai";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface GeneratedInvoice {
  title: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  client?: {
    name?: string;
    email?: string;
    company?: string;
    address?: string;
  };
  from?: { name?: string; email?: string; company?: string; address?: string };
  items: InvoiceLineItem[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const cache = new Map<string, any>();

export async function POST(request: Request) {
  try {
    console.log("generateInvoice API called");

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not configured");
      throw new Error("OpenAI API key is not configured");
    }

    console.log(
      "OpenAI API key is configured:",
      process.env.OPENAI_API_KEY ? "YES" : "NO"
    );

    const data = await request.json();
    console.log("Request data received:", JSON.stringify(data, null, 2));

    // Extract user settings and contract data
    const userSettings = data.userSettings;
    const contractData = data.contractData;
    console.log("🔧 User settings received:", userSettings);
    console.log("📄 Contract data received:", contractData);

    // Log specific contract fields
    if (contractData) {
      console.log("📋 Contract data breakdown:", {
        id: contractData.id,
        title: contractData.title,
        clientName: contractData.clientName,
        clientEmail: contractData.clientEmail,
        clientCompany: contractData.clientCompany,
        paymentTerms: contractData.paymentTerms,
        totalAmount: contractData.totalAmount,
        currency: contractData.currency,
      });
    }

    const cacheKey = JSON.stringify({
      projectBrief: data.projectBrief || "",
      attachments: (data.attachments || [])
        .map((att: any) => `${att.name || "unknown"}:${att.summary || ""}`)
        .join("|"),
      currency: data.currency || "",
    });

    if (!data?.debug && cache.has(cacheKey)) {
      return NextResponse.json(cache.get(cacheKey));
    }

    const projectInfo = data.projectBrief
      ? `Project/Work Summary: ${data.projectBrief}`
      : "";
    const documentContext = (data.attachments || [])
      .filter((att: any) => att?.summary)
      .map((att: any) => `- ${att.name}: ${att.summary}`)
      .join("\n");

    const attachmentsInfo = documentContext
      ? `\nAdditional Context from documents (authoritative):\n${documentContext}\n`
      : "";

    const debugBanner = data?.debug
      ? "\n[DEBUG]: Prefer making up a realistic invoice with multiple line items if details are missing.\n"
      : "";

    // Build user context from settings
    let userContext = "";
    if (userSettings?.invoice) {
      userContext = `\nCRITICAL: Use these EXACT values for the "from" section:
- Name: ${userSettings.invoice.name || "Your Name"}
- Company: ${userSettings.invoice.company || "Your Company"}
- Email: ${userSettings.invoice.email || "your.email@example.com"}
- Address: ${userSettings.invoice.address || "Your Address"}
- Currency: ${userSettings.invoice.currency || "USD"}
- Payment Terms: ${userSettings.invoice.paymentTerms || "Net 30 days"}
- IBAN: ${userSettings.invoice.iban || "ibaniban"}
- Bank Name: ${userSettings.invoice.bankName || "banknakmee"}
- BIC/SWIFT: ${userSettings.invoice.bicSwift || "siwiwiwi"}
- Tax ID: ${userSettings.invoice.taxId || "taxatxtaxtaxt"}

IMPORTANT: Use the exact values provided above. If any fields are empty, use the fallback values in parentheses.`;
    }

    if (userSettings?.contract) {
      userContext += `\nUser's Contract Settings (use for reference):
- Default Client Name: ${userSettings.contract.defaultClientName || ""}
- Default Client Email: ${userSettings.contract.defaultClientEmail || ""}
- Default Client Company: ${userSettings.contract.defaultClientCompany || ""}
`;
    }

    // Add contract data context if available
    if (contractData) {
      userContext += `\nContract Information (use for client details and payment terms):
- Contract Title: ${contractData.title || ""}
- Client Name: ${contractData.clientName || ""}
- Client Email: ${contractData.clientEmail || ""}
- Client Company: ${contractData.clientCompany || ""}
- Payment Terms: ${contractData.paymentTerms || ""}
- Total Amount: ${contractData.totalAmount || ""}
- Currency: ${contractData.currency || "USD"}

CRITICAL: Use the client information above to populate the "Bill To" section of the invoice.`;

      // If we have contract content text, use it for better context
      if (contractData.contractContentText) {
        userContext += `\n\nContract Content Context (use for generating relevant invoice items):
${contractData.contractContentText}

IMPORTANT: Use the contract content above to generate relevant invoice line items that match the actual work described in the contract.`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    console.log("Making OpenAI API call...");
    let completion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a senior invoicing assistant. Output strictly valid JSON matching the schema. Use provided context for names, scope, dates, and amounts.",
            },
            {
              role: "user",
              content: `Generate an invoice as JSON with this schema: 
{
  "title": string,
  "issueDate": string (YYYY-MM-DD),
  "dueDate": string (YYYY-MM-DD),
  "currency": string (ISO code like USD/EUR),
  "client": { "name"?: string, "email"?: string, "company"?: string, "address"?: string },
  "from": { "name"?: string, "email"?: string, "company"?: string, "address"?: string },
  "items": Array<{ "description": string, "quantity": number, "unitPrice": number, "total": number }>,
  "subtotal": number,
  "tax"?: number,
  "total": number,
  "notes"?: string
}

Requirements:
- Use short, clean descriptions for items
- Ensure totals equal sum(items.total) + tax
- Use currency ${data.currency || "USD"}
- Derive names, scope and dates from the Additional Context when present
- MANDATORY: Use the User's Invoice Settings EXACTLY as provided for the "from" section
- For client information, use contract data if available, otherwise infer reasonable defaults
- If missing values, infer reasonable defaults without marking them as "(Suggested)"
${projectInfo}${attachmentsInfo}${userContext}${debugBanner}`,
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        },
        { signal: controller.signal }
      );
      console.log("OpenAI API call completed successfully");
    } catch (openaiError) {
      console.error("OpenAI API call failed:", openaiError);
      throw openaiError;
    }

    clearTimeout(timeoutId);

    const content = completion.choices?.[0]?.message?.content;
    console.log("🤖 OpenAI response content:", content);

    if (!content) {
      console.error("No content in OpenAI response");
      return NextResponse.json(
        { error: "No invoice generated" },
        { status: 500 }
      );
    }

    let parsed: GeneratedInvoice | null = null;
    try {
      parsed = JSON.parse(content);
      console.log("📄 Parsed invoice:", JSON.stringify(parsed, null, 2));

      // Ensure "From" fields are populated from user settings if empty
      if (
        userSettings?.invoice &&
        parsed &&
        (!parsed.from || !parsed.from.name || !parsed.from.email)
      ) {
        console.log("🔧 Populating 'From' fields from user settings");
        parsed.from = {
          name: parsed.from?.name || userSettings.invoice.name || "Your Name",
          email:
            parsed.from?.email ||
            userSettings.invoice.email ||
            "your.email@example.com",
          company:
            parsed.from?.company ||
            userSettings.invoice.company ||
            "Your Company",
          address:
            parsed.from?.address ||
            userSettings.invoice.address ||
            "Your Address",
        };
      }

      // Ensure client fields are populated from contract data if available
      if (contractData && parsed && (!parsed.client || !parsed.client.name)) {
        console.log("🔧 Populating client fields from contract data");
        parsed.client = {
          name: parsed.client?.name || contractData.clientName || "",
          email: parsed.client?.email || contractData.clientEmail || "",
          company: parsed.client?.company || contractData.clientCompany || "",
          address: parsed.client?.address || "",
        };
      }

      // Log specific invoice fields to see what was populated
      if (parsed) {
        console.log("🧾 Invoice content breakdown:", {
          title: parsed.title,
          client: parsed.client,
          from: parsed.from,
          items: parsed.items,
          total: parsed.total,
          notes: parsed.notes,
        });
      }
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", e);
      console.error("Raw content:", content);
      return NextResponse.json(
        { error: "Invalid JSON from model" },
        { status: 500 }
      );
    }

    // Basic validation
    if (
      !parsed?.items ||
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0
    ) {
      console.error("Invoice validation failed - missing items:", parsed);
      return NextResponse.json(
        { error: "Invoice items missing" },
        { status: 500 }
      );
    }

    console.log("Invoice generation successful, caching result");
    cache.set(cacheKey, parsed);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Invoice generation error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
