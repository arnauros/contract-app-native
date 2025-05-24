import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

// Define types for the contract content
interface BlockData {
  text?: string;
  items?: string[];
}

interface Block {
  type: string;
  data: BlockData;
}

interface Content {
  blocks: Block[];
}

export async function POST(request: Request) {
  try {
    console.log("PDF Generation API called");

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("Request body parsed successfully");
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { content, contractId } = body;

    console.log("ContractId:", contractId);
    console.log(
      "Content structure:",
      JSON.stringify({
        hasBlocks: !!content?.blocks,
        blockCount: content?.blocks?.length || 0,
      })
    );

    if (!content || !content.blocks || !Array.isArray(content.blocks)) {
      console.error("Invalid content structure:", content);
      return NextResponse.json(
        { error: "Invalid contract content structure" },
        { status: 400 }
      );
    }

    // Create a document
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    // Set up a buffer to capture the PDF data
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Handle potential errors in document generation
    doc.on("error", (err) => {
      console.error("PDFKit error:", err);
    });

    // Set font styling
    doc.font("Helvetica");

    // Add title to the PDF
    doc.fontSize(24).text("Contract Document", { align: "center" });
    doc.moveDown(1);

    // Create the PDF content
    try {
      content.blocks.forEach((block: Block, index: number) => {
        console.log(`Processing block ${index} of type ${block.type}`);

        // Ensure block has the expected structure to avoid errors
        if (!block || typeof block !== "object") {
          console.warn(`Skipping invalid block at index ${index}`);
          return;
        }

        switch (block.type) {
          case "header":
            if (block.data?.text) {
              doc
                .fontSize(18)
                .font("Helvetica-Bold")
                .text(block.data.text)
                .font("Helvetica")
                .fontSize(12)
                .moveDown(0.5);
            }
            break;
          case "paragraph":
            if (block.data?.text) {
              doc.fontSize(12).text(block.data.text).moveDown(0.5);
            }
            break;
          case "list":
            if (
              block.data?.items &&
              Array.isArray(block.data.items) &&
              block.data.items.length > 0
            ) {
              doc.moveDown(0.5);
              block.data.items.forEach((item: string, itemIndex: number) => {
                if (typeof item === "string") {
                  doc
                    .fontSize(12)
                    .text(`• ${item}`, { indent: 20 })
                    .moveDown(0.2);
                } else {
                  console.warn(
                    `Skipping non-string list item ${itemIndex} in block ${index}`
                  );
                }
              });
              doc.moveDown(0.3);
            }
            break;
          default:
            console.log(`Skipping unsupported block type: ${block.type}`);
            break;
        }
      });
    } catch (contentError) {
      console.error("Error generating PDF content:", contentError);
      return NextResponse.json(
        { error: "Error generating PDF content" },
        { status: 500 }
      );
    }

    // Finalize the PDF and end the stream
    doc.end();
    console.log("PDF document finalized");

    // Return a Promise that resolves when the doc stream is complete
    return new Promise<NextResponse>((resolve, reject) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error("PDF generation timed out"));
      }, 10000);

      doc.on("end", () => {
        clearTimeout(timeout);
        console.log("PDF generation completed, chunks:", chunks.length);
        try {
          const buffer = Buffer.concat(chunks);
          console.log("PDF buffer created, size:", buffer.length);

          resolve(
            new NextResponse(buffer, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=contract-${
                  contractId || "document"
                }.pdf`,
              },
            })
          );
        } catch (bufferError) {
          console.error("Error creating PDF buffer:", bufferError);
          reject(bufferError);
        }
      });
    }).catch((error) => {
      console.error("Promise rejection in PDF generation:", error);
      return NextResponse.json(
        { error: "PDF generation failed" },
        { status: 500 }
      );
    });
  } catch (error) {
    console.error("Unhandled error in PDF generation:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
