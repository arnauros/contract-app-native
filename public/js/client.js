/* global firebase, EditorJS, Header, List, Quote, Paragraph, Delimiter, SignaturePad, pdfjsLib */
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  // Declare DOM elements
  const form = document.getElementById("contractForm");
  const slides = document.querySelectorAll(".slide-style");
  const nextButtons = document.querySelectorAll(".is-next");
  const signButton = document.querySelector(".is-sign");
  const sendButton = document.querySelector(".is-send");
  const documentDiv = document.getElementById("generatedDocument");
  const signatureCanvas = document.getElementById("signatureCanvas");
  const clearSignatureButton = document.getElementById("clearSignature");
  const signatureInput = document.getElementById("textField-3");
  const textField2 = document.getElementById("textField-2");
  const fileInput = document.getElementById("buttonUpload");
  const fileUploadWrapper = document.getElementById("fileUploadWrapper");
  const fileUploadDiv = document.getElementById("fileUploadDiv");
  const fileRemoveBTN = document.getElementById("fileRemoveBTN");
  const fileTitle = document.getElementById("fileTitle");
  const tagStackElements = document.querySelectorAll(".tagStack");
  const techStack = document.getElementById("techStack");
  const defaultText = "The stack I'll be using is";

  const formData = {}; // Object to store form inputs
  let editor; // Editor.js instance
  let signaturePad; // SignaturePad instance
  let selectedFile = null;

  // Function to show a specific slide
  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.style.display = i === index ? "block" : "none";
    });
  }

  // Initially hide the generated document section
  if (documentDiv) documentDiv.style.display = "none";
  let currentSlideIndex = 0;
  showSlide(currentSlideIndex);

  // Initialize Editor.js
  initializeEditor();

  // Initialize SignaturePad
  initializeSignaturePad();

  // Update the 'Next' button event listener
  nextButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const currentSlideInputs =
        slides[currentSlideIndex].querySelectorAll("input, textarea");
      currentSlideInputs.forEach((input) => {
        formData[input.id] = input.value;
        console.log(`Value of ${input.id}: `, input.value);
      });

      if (currentSlideIndex === 1) {
        try {
          // Store the contractId returned by generateAIDocument
          const contractId = await generateAIDocument();
          // Store the contractId in a data attribute of the send button
          sendButton.dataset.contractId = contractId;
        } catch (error) {
          console.error("Error generating AI document:", error);
        }
      }

      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
      }
    });
  });

  // Handle file upload
  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      if (event.target.files && event.target.files.length > 0) {
        selectedFile = event.target.files[0];
        const fileName = selectedFile.name;

        console.log("File selected:", fileName);
        console.log("File object:", selectedFile);

        if (fileUploadDiv) {
          fileUploadDiv.textContent = `Selected file: ${fileName}`;
        }

        if (fileRemoveBTN) fileRemoveBTN.style.display = "inline";
        if (fileTitle) fileTitle.textContent = fileName;
      } else {
        console.log("No file selected");
        selectedFile = null;
        if (fileUploadDiv) fileUploadDiv.textContent = "No file selected";
        if (fileRemoveBTN) fileRemoveBTN.style.display = "none";
        if (fileTitle) fileTitle.textContent = "None";
      }
    });
  }

  // Handle PDF removal
  if (fileRemoveBTN) {
    fileRemoveBTN.addEventListener("click", () => {
      if (fileInput) fileInput.value = "";
      if (fileUploadDiv) fileUploadDiv.textContent = "No file selected";
      if (fileRemoveBTN) fileRemoveBTN.style.display = "none";
      if (fileTitle) fileTitle.textContent = "None";
    });
  }

  if (typeof pdfjsLib !== "undefined") {
    console.log("pdf.js is loaded. Version:", pdfjsLib.version);
  } else {
    console.error("pdf.js is not loaded.");
  }
  // Function to read PDF content (using PDF.js)
  function readPDFContent(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = async function (event) {
        console.log("FileReader result:", event.target.result); // Check the result here

        try {
          const typedArray = new Uint8Array(event.target.result);
          console.log("Typed array created:", typedArray); // Check the typed array

          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          console.log("PDF document loaded:", pdf); // Check if PDF document is loaded

          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            console.log(`Processing page ${i}`); // Log page processing

            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(" ");
            fullText += pageText + "\n";
          }

          console.log("Extracted PDF content:", fullText);
          resolve(fullText);
        } catch (error) {
          console.error("Error reading PDF:", error);
          reject(error);
        }
      };

      fileReader.onerror = function (error) {
        console.error("FileReader error:", error);
        reject(error);
      };

      fileReader.readAsArrayBuffer(file);
    });
  }

  // Tag Stack Functionality
  if (textField2) textField2.placeholder = defaultText;

  if (techStack) {
    techStack.addEventListener("click", (event) => {
      const clickedTag = event.target.closest(".tagstack");
      if (clickedTag && textField2) {
        const tagName = clickedTag.textContent.trim();
        console.log("Tag clicked:", tagName);

        if (!textField2.value || textField2.value === defaultText) {
          textField2.value = defaultText + " ";
        }

        textField2.value += textField2.value.endsWith(" ")
          ? tagName
          : ", " + tagName;

        clickedTag.style.display = "none";

        textField2.focus();
        textField2.setSelectionRange(
          textField2.value.length,
          textField2.value.length
        );
        console.log("Updated textarea value:", textField2.value);
      }
    });
  }

  // Add event listener to textarea for tag removal
  if (textField2) {
    textField2.addEventListener("input", function () {
      const tags = this.value
        .replace(defaultText, "")
        .split(",")
        .map((tag) => tag.trim());
      const removedTags = document.querySelectorAll(
        '.tagstack[style*="display: none"]'
      );

      removedTags.forEach((tag) => {
        if (!tags.includes(tag.textContent.trim())) {
          tag.style.display = "";
        }
      });
    });
  }

  // Function to process inline formatting
  function processInlineFormatting(text) {
    // Handle bold text
    text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    // Handle italic text
    text = text.replace(/\*(.*?)\*/g, "<i>$1</i>");

    // Handle inline code
    text = text.replace(/`(.*?)`/g, "<code>$1</code>");

    // Handle links
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    return text;
  }

  // Get a Firestore instance
  const db = firebase.firestore();

  async function generateAIDocument() {
    let pdfContent = "";

    if (selectedFile) {
      try {
        console.log("Starting to read PDF content...");
        pdfContent = await readPDFContent(selectedFile);
        console.log("PDF content read successfully:", pdfContent);
      } catch (error) {
        console.error("Error reading PDF:", error);
      }
    } else {
      console.log("No file selected for AI document generation");
    }

    const apiUrl =
      "https://us-central1-contract-app-5cd3d.cloudfunctions.net/app/api/openai";

    const promptText = `Create a contract using the following details:
  Project Description: ${formData["textField-1"] || "[No project description provided]"}
  Tech Stack: ${formData["textField-2"] || "[No tech stack provided]"}
  Additional Information from PDF:
  ${pdfContent || "[No PDF content available]"}

  Instructions:
  - Analyze both the user-provided information and the PDF content.
  - Create a unified contract that incorporates all relevant details without redundancy.
  - If there are conflicts between user-provided information and PDF content, prioritize the user-provided information but mention any significant discrepancies.
  - Ensure the contract follows a logical structure with clear sections (e.g., Project Scope, Timeline, Budget, Terms and Conditions).
  - If any critical information is missing, add placeholders or suggest what kind of information should be added.
  - The final contract should be coherent, professional, and ready for review and signatures.`;

    console.log("Sending prompt to AI:", promptText);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("AI Document Generated:", data.response);

      // Store the generated contract in Firebase Firestore
      const contractId = `contract_${Date.now()}`;
      const contractRef = db.collection("contracts").doc(contractId);

      await contractRef.set({
        projectDescription: formData["textField-1"] || "",
        techStack: formData["textField-2"] || "",
        pdfContent: pdfContent || "",
        generatedContract: data.response,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: "generated",
      });

      console.log("Contract saved in Firebase with ID:", contractId);

      if (documentDiv) documentDiv.style.display = "block";

      if (editor) {
        await editor.isReady;
        editor.blocks.clear();

        const lines = data.response.split("\n");
        lines.forEach((line) => {
          if (line.startsWith("### ")) {
            editor.blocks.insert("header", {
              text: line.replace("### ", ""),
              level: 3,
            });
          } else if (line.startsWith("## ")) {
            editor.blocks.insert("header", {
              text: line.replace("## ", ""),
              level: 2,
            });
          } else if (line.startsWith("# ")) {
            editor.blocks.insert("header", {
              text: line.replace("# ", ""),
              level: 1,
            });
          } else if (line.startsWith("- ")) {
            editor.blocks.insert("list", {
              items: [processInlineFormatting(line.replace("- ", ""))],
              style: "unordered",
            });
          } else if (/^\d+\.\s/.test(line)) {
            editor.blocks.insert("list", {
              items: [processInlineFormatting(line.replace(/^\d+\.\s/, ""))],
              style: "ordered",
            });
          } else if (line.trim() === "") {
            editor.blocks.insert("paragraph", { text: "" });
          } else {
            editor.blocks.insert("paragraph", {
              text: processInlineFormatting(line),
            });
          }
        });
      }

      // Return the contractId for future reference
      return contractId;
    } catch (error) {
      console.error("Error generating or storing AI document:", error);
      throw error;
    }
  }

  // Handle document signing
  if (signButton) {
    signButton.addEventListener("click", (event) => {
      event.preventDefault();

      const typedSignature = signatureInput ? signatureInput.value.trim() : "";
      let signature = "";

      if (typedSignature !== "") {
        signature = typedSignature;
      } else if (signaturePad && !signaturePad.isEmpty()) {
        signature =
          "<img src='" + signaturePad.toDataURL() + "' alt='Signature'>";
      } else {
        alert("Please either type or draw a signature.");
        return;
      }

      formData["signature"] = signature;
      if (editor) {
        editor.blocks.insert("paragraph", {
          text: `Signed by: ${signature}`,
        });
      }

      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
      }
    });
  }

  // Clear the signature
  if (clearSignatureButton && signaturePad) {
    clearSignatureButton.addEventListener("click", () => {
      signaturePad.clear();
    });
  }

  // Event listener for the send button
  if (sendButton) {
    sendButton.addEventListener("click", async (event) => {
      event.preventDefault();

      // Retrieve the contractId from the button's data attribute
      const contractId = event.target.dataset.contractId;

      if (!contractId) {
        alert("No contract generated yet. Please generate a contract first.");
        return;
      }

      try {
        // Get the current contract data from Firebase
        const contractRef = db.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();

        if (!contractDoc.exists) {
          throw new Error("Contract not found in Firebase");
        }

        // Save the current state of the editor
        const editorContent = await editor.save();

        // Update the contract in Firebase with the latest editor content
        await contractRef.update({
          editorContent: editorContent,
          status: "ready_to_send",
        });

        // Prepare FormData for sending
        const formDataToSend = new FormData();
        formDataToSend.append("contract", JSON.stringify(editorContent));
        formDataToSend.append("contractId", contractId);

        // Append other form data (if any) to FormData
        for (const key in formData) {
          formDataToSend.append(key, formData[key]);
        }

        // Check if fileInput exists and if files are available
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          formDataToSend.append("file", fileInput.files[0]);
        } else {
          console.log("No file selected");
        }

        // Send the contract
        const sendEmailUrl =
          "https://us-central1-contract-app-native.cloudfunctions.net/app/upload";
        const response = await fetch(sendEmailUrl, {
          method: "POST",
          body: formDataToSend,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Document sent successfully:", data);

        // Update the contract status in Firebase
        await contractRef.update({ status: "sent" });

        alert("Contract sent successfully!");
      } catch (error) {
        console.error("Error sending contract:", error);
        alert(`Failed to send contract: ${error.message}. Please try again.`);
      }
    });
  }

  // Editor.js initialization
  function initializeEditor() {
    editor = new EditorJS({
      holder: "editorjs",
      tools: {
        header: {
          class: Header,
          inlineToolbar: ["link", "bold"],
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3],
            defaultLevel: 2,
          },
        },
        list: { class: List, inlineToolbar: true },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: "Enter a quote",
            captionPlaceholder: "Quote's author",
          },
        },
        paragraph: { class: Paragraph, inlineToolbar: true },
        delimiter: Delimiter,
      },
      placeholder: "Let's write your contract here...",
      autofocus: true,
      onReady: () => {
        console.log("Editor.js is ready");
      },
    });
  }

  // Initialize SignaturePad
  function initializeSignaturePad() {
    if (signatureCanvas) {
      signaturePad = new SignaturePad(signatureCanvas);

      if (clearSignatureButton) {
        clearSignatureButton.addEventListener("click", () => {
          signaturePad.clear();
        });
      }

      if (signButton) {
        signButton.addEventListener("click", () => {
          if (signaturePad.isEmpty()) {
            alert("Please provide a signature.");
            return;
          }

          formData["signature"] = signaturePad.toDataURL();
          console.log("Signature saved in formData:", formData["signature"]);
        });
      }
    } else {
      console.error("Signature canvas not found");
    }
  }

  // Function to send the contract (updated to use Firebase v8 syntax)
  async function sendContract(contractId) {
    try {
      const contractRef = db.collection("contracts").doc(contractId);
      const contractDoc = await contractRef.get();

      if (contractDoc.exists) {
        const contractData = contractDoc.data();

        // Implement your email sending logic here
        const sendEmailUrl =
          "https://us-central1-contract-app-5cd3d.cloudfunctions.net/sendEmail";
        const response = await fetch(sendEmailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "client@example.com", // Replace with actual client email
            subject: "Your Contract",
            text: contractData.generatedContract,
            // You might want to add HTML version or attachments here
          }),
        });

        if (response.ok) {
          // Update the contract status in Firestore
          await contractRef.update({ status: "sent" });
          console.log("Contract sent successfully");
        } else {
          throw new Error("Failed to send email");
        }
      } else {
        throw new Error("Contract not found");
      }
    } catch (error) {
      console.error("Error sending contract:", error);
      throw error;
    }
  }
});
